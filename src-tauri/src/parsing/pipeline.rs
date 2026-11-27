use std::{
    path::Path,
    sync::{Arc, Mutex},
    time::Duration,
};

use anyhow::{bail, Context, Result};
use rusqlite::params;
use serde::Deserialize;
use tauri::{AppHandle, Manager};
use tokio::{sync::Semaphore, task::JoinSet};

use crate::{
    app::state::{notify, AppState},
    claude::{
        cli::{self, ClaudeEnv},
        prompts,
    },
    library::{
        books::{self, Book, Section},
        documents, import,
    },
    parsing::budget::{Budget, CapReached},
    storage::{
        db::Db,
        paths,
        settings::{self, Settings},
        usage,
    },
    study::{
        exports,
        questions::{self, GeneratedQuestion},
    },
};

const SECTION_TIMEOUT: Duration = Duration::from_secs(20 * 60);
const BOOK_TIMEOUT: Duration = Duration::from_secs(30 * 60);
const RETRY_DELAY: Duration = Duration::from_secs(10);
const MAX_ATTEMPTS: u32 = 2;
const BOOK_DIGEST_CHARS: usize = 600_000;

#[derive(Deserialize)]
struct SectionOutput {
    title: String,
    summary: String,
    key_data: String,
    notes: String,
    #[serde(default)]
    questions: Vec<GeneratedQuestion>,
}

#[derive(Deserialize)]
struct BookOutput {
    title: String,
    author: String,
    summary: String,
    #[serde(default)]
    overview_title: String,
    overview: String,
    #[serde(default)]
    glossary_title: String,
    glossary: String,
    #[serde(default)]
    takeaways_title: String,
    takeaways: String,
    #[serde(default)]
    questions: Vec<GeneratedQuestion>,
}

type SharedBudget = Arc<Mutex<Budget>>;

const BOOK_PASS_WEIGHT: f64 = 2.0;

struct SectionJob {
    budget: SharedBudget,
    app: AppHandle,
    db: Db,
    env: ClaudeEnv,
    settings: Settings,
    book: Arc<Book>,
    pages: Arc<Vec<String>>,
    total: usize,
}

/// Starts (or resumes) parsing a book in the background. Does nothing when a
/// job for the book is already running.
pub fn start(app: &AppHandle, book_id: &str) -> Result<()> {
    let state = app.state::<AppState>();
    let mut jobs = state.jobs.lock().expect("jobs lock");
    if jobs.get(book_id).is_some_and(|job| !job.inner().is_finished()) {
        return Ok(());
    }

    books::set_status(&state.db, book_id, "queued", None, None)?;
    let handle = tauri::async_runtime::spawn(run(app.clone(), book_id.to_string()));
    jobs.insert(book_id.to_string(), handle);
    drop(jobs);

    notify(app, book_id);
    Ok(())
}

/// Stops a running job. Sections that were in flight go back to pending, so
/// resuming never repeats finished work.
pub fn pause(app: &AppHandle, book_id: &str) -> Result<()> {
    let state = app.state::<AppState>();
    if let Some(job) = state.jobs.lock().expect("jobs lock").remove(book_id) {
        job.abort();
    }

    state.db.with(|conn| {
        conn.execute("UPDATE sections SET status = 'pending' WHERE book_id = ?1 AND status = 'processing'", [book_id])?;
        conn.execute(
            "UPDATE books SET status = 'paused' WHERE id = ?1 AND status IN ('queued', 'processing')",
            [book_id],
        )
    })?;

    notify(app, book_id);
    Ok(())
}

/// Background task body: runs the job and records the outcome on the book.
/// Reaching the spending cap pauses the book; any other error fails it.
async fn run(app: AppHandle, book_id: String) {
    let result = run_inner(&app, &book_id).await;

    let state = app.state::<AppState>();
    if let Err(error) = result {
        let status = if error.downcast_ref::<CapReached>().is_some() { "paused" } else { "failed" };
        let _ = books::set_status(&state.db, &book_id, status, None, Some(&format!("{error:#}")));
    }
    state.jobs.lock().expect("jobs lock").remove(&book_id);

    notify(&app, &book_id);
}

/// The two stages of the one-time parse: every section, then the whole book.
async fn run_inner(app: &AppHandle, book_id: &str) -> Result<()> {
    let state = app.state::<AppState>();
    let db = state.db.clone();
    let settings = settings::load(&db)?;
    let env = state.claude_env(&settings).await?;
    let spent = books::get_book(&db, book_id)?.cost_usd;
    let budget: SharedBudget = Arc::new(Mutex::new(Budget::new(settings.max_cost_usd, spent)));

    books::set_status(&db, book_id, "processing", Some("sections"), None)?;
    notify(app, book_id);
    parse_sections(app, &db, &env, &settings, &budget, book_id).await?;

    books::set_status(&db, book_id, "processing", Some("book"), None)?;
    notify(app, book_id);
    synthesize(&db, &env, &settings, &budget, &books::get_book(&db, book_id)?).await?;

    let book = books::get_book(&db, book_id)?;
    exports::export_question_bank(&db, &book)?;
    books::set_status(&db, book_id, "ready", Some("done"), None)?;
    Ok(())
}

/// Sends every unfinished section to Claude, `settings.concurrency` at a time.
/// Stops at the spending cap and fails (keeping finished sections) when any
/// section could not be parsed.
async fn parse_sections(
    app: &AppHandle,
    db: &Db,
    env: &ClaudeEnv,
    settings: &Settings,
    budget: &SharedBudget,
    book_id: &str,
) -> Result<()> {
    db.with(|conn| {
        conn.execute(
            "UPDATE sections SET status = 'pending', error = NULL
             WHERE book_id = ?1 AND status IN ('failed', 'processing')",
            [book_id],
        )
    })?;

    let sections = books::get_sections(db, book_id)?;
    if sections.is_empty() {
        bail!("This book has no sections to process. Remove it and add it again.");
    }

    let pending: Vec<Section> = sections.iter().filter(|s| s.status != "done").cloned().collect();
    if pending.is_empty() {
        return Ok(());
    }

    let book = Arc::new(books::get_book(db, book_id)?);
    let pages = Arc::new(import::read_pages(&book)?);
    let semaphore = Arc::new(Semaphore::new(settings.concurrency as usize));
    let total = sections.len();

    let mut set = JoinSet::new();
    for section in pending {
        let job = SectionJob {
            budget: budget.clone(),
            app: app.clone(),
            db: db.clone(),
            env: env.clone(),
            settings: settings.clone(),
            book: book.clone(),
            pages: pages.clone(),
            total,
        };
        let semaphore = semaphore.clone();

        set.spawn(async move {
            let _permit = semaphore.acquire_owned().await;
            job.process(section).await
        });
    }

    let mut failures = 0;
    let mut cap_reached = false;
    let mut last_error = String::new();
    while let Some(joined) = set.join_next().await {
        let error = match joined {
            Ok(Ok(())) => continue,
            Ok(Err(error)) if error.downcast_ref::<CapReached>().is_some() => {
                cap_reached = true;
                continue;
            }
            Ok(Err(error)) => format!("{error:#}"),
            Err(error) => error.to_string(),
        };
        failures += 1;
        last_error = error;
    }

    if cap_reached {
        let spent = budget.lock().expect("budget lock").spent();
        return Err(CapReached { spent, cap: settings.max_cost_usd }.into());
    }
    if failures > 0 {
        bail!("{failures} of {total} sections failed ({last_error}). Press Resume to retry them.");
    }
    Ok(())
}

impl SectionJob {
    /// Parses one section and records a failure on it when that does not work.
    async fn process(&self, section: Section) -> Result<()> {
        let result = self.process_inner(&section).await;

        let cap_reached = result.as_ref().err().is_some_and(|error| error.downcast_ref::<CapReached>().is_some());
        if let (Err(error), false) = (&result, cap_reached) {
            let message = format!("{error:#}");
            let _ = self.db.with(|conn| {
                conn.execute(
                    "UPDATE sections SET status = 'failed', error = ?2 WHERE id = ?1",
                    params![section.id, message],
                )
            });
        }

        notify(&self.app, &self.book.id);
        result
    }

    /// Text sent to Claude for a section, with page markers so it can cite
    /// pages. None for scanned sections, which Claude reads from the PDF.
    fn section_text(&self, start: usize, end: usize, mode: &str) -> Option<String> {
        (mode == "text").then(|| {
            (start..=end)
                .map(|page| format!("[Page {page}]\n{}", self.pages[page - 1]))
                .collect::<Vec<_>>()
                .join("\n\n")
        })
    }

    async fn process_inner(&self, section: &Section) -> Result<()> {
        let ceiling = self.budget.lock().expect("budget lock").reserve(1.0)?;

        self.db.with(|conn| {
            conn.execute("UPDATE sections SET status = 'processing', error = NULL WHERE id = ?1", [section.id])
        })?;
        notify(&self.app, &self.book.id);

        let start = section.start_page.max(1) as usize;
        let end = (section.end_page as usize).min(self.pages.len());
        let prompt = prompts::section_prompt(&prompts::SectionInput {
            book_title: &self.book.title,
            author: self.book.author.as_deref(),
            index: section.idx as usize + 1,
            total: self.total,
            title: &section.title,
            placeholder: section.placeholder,
            start_page: start,
            end_page: end,
            questions: self.settings.questions_per_section,
            content: self.section_text(start, end, &section.mode),
        });

        let schema = prompts::section_schema();
        let request = cli::Request {
            model: &self.settings.model,
            system: prompts::SYSTEM,
            prompt,
            schema: &schema,
            allow_read: section.mode == "vision",
            cwd: Path::new(&self.book.dir),
            timeout: SECTION_TIMEOUT,
            max_budget_usd: Some(ceiling),
        };
        let response = call_with_retry(&self.env, request).await;
        self.budget.lock().expect("budget lock").settle(response.as_ref().ok().map(|r| r.cost_usd));
        let response = response?;
        let output: SectionOutput =
            serde_json::from_value(response.output).context("Claude's answer had an unexpected shape")?;

        let title = Some(output.title.trim()).filter(|t| !t.is_empty()).unwrap_or(&section.title).to_string();
        let stem = format!("{:03}-{}", section.idx + 1, paths::slugify(&title, 50));
        let file = format!("{stem}.md");
        let pages = if start == end { format!("Page {start}") } else { format!("Pages {start}–{end}") };
        let summary = output.summary.trim();

        let key_data = format!("*{pages}*\n\n{}", output.key_data.trim());
        let notes = format!("*{pages}*\n\n> {summary}\n\n{}", output.notes.trim());
        documents::write_document(&self.book, "key-data", &file, &title, &key_data)?;
        documents::write_document(&self.book, "notes", &file, &title, &notes)?;

        let limit = output.questions.len().min(self.settings.questions_per_section as usize);
        let book_id = self.book.id.clone();
        self.db.with(|conn| {
            let tx = conn.transaction()?;
            questions::replace_questions(&tx, &book_id, Some(section.id), &output.questions[..limit])?;
            tx.execute(
                "UPDATE sections SET status = 'done', error = NULL, title = ?2, summary = ?3, file_stem = ?4
                 WHERE id = ?1",
                params![section.id, title, summary, stem],
            )?;
            usage::record(&tx, &book_id, response.cost_usd, response.limits.as_ref())?;
            tx.commit()
        })?;
        Ok(())
    }
}

/// Calls Claude, retrying once after a short pause (rate limits, hiccups).
async fn call_with_retry(env: &ClaudeEnv, request: cli::Request<'_>) -> Result<cli::Response> {
    let mut attempt = 0;
    loop {
        attempt += 1;
        let req = cli::Request { prompt: request.prompt.clone(), ..request };

        match cli::run_structured(env, req).await {
            Ok(response) => return Ok(response),
            Err(error) if attempt >= MAX_ATTEMPTS => return Err(error),
            Err(_) => tokio::time::sleep(RETRY_DELAY).await,
        }
    }
}

/// A document title written by Claude, or `fallback` when it is empty.
fn title_or<'a>(title: &'a str, fallback: &'a str) -> &'a str {
    Some(title.trim()).filter(|t| !t.is_empty()).unwrap_or(fallback)
}

/// Key data of every section, capped so the whole-book prompt stays bounded.
fn book_digest(book: &Book, sections: &[Section]) -> Vec<prompts::BookSection> {
    let per_section_cap = (BOOK_DIGEST_CHARS / sections.len().max(1)).max(2_000);

    sections
        .iter()
        .map(|section| {
            let key_data = section
                .file_stem
                .as_deref()
                .and_then(|stem| documents::read_document(book, "key-data", &format!("{stem}.md")).ok())
                .unwrap_or_default();

            prompts::BookSection {
                title: section.title.clone(),
                start_page: section.start_page,
                end_page: section.end_page,
                summary: section.summary.clone().unwrap_or_default(),
                key_data: key_data.chars().take(per_section_cap).collect(),
            }
        })
        .collect()
}

/// Whole-book pass: overview, glossary, key takeaways, cross-chapter
/// questions, and the book's real title, author and summary.
async fn synthesize(db: &Db, env: &ClaudeEnv, settings: &Settings, budget: &SharedBudget, book: &Book) -> Result<()> {
    let ceiling = budget.lock().expect("budget lock").reserve(BOOK_PASS_WEIGHT)?;

    let sections = books::get_sections(db, &book.id)?;
    let digest = book_digest(book, &sections);

    let schema = prompts::book_schema();
    let request = cli::Request {
        model: &settings.model,
        system: prompts::SYSTEM,
        prompt: prompts::book_prompt(&book.title, book.author.as_deref(), &digest, settings.book_questions),
        schema: &schema,
        allow_read: false,
        cwd: Path::new(&book.dir),
        timeout: BOOK_TIMEOUT,
        max_budget_usd: Some(ceiling),
    };
    let response = call_with_retry(env, request).await;
    budget.lock().expect("budget lock").settle(response.as_ref().ok().map(|r| r.cost_usd));
    let response = response?;
    let output: BookOutput =
        serde_json::from_value(response.output).context("Claude's answer had an unexpected shape")?;

    let summary = output.summary.trim();
    let overview = format!("> {summary}\n\n{}", output.overview.trim());
    let overview_title = title_or(&output.overview_title, "Overview");
    let glossary_title = title_or(&output.glossary_title, "Glossary");
    let takeaways_title = title_or(&output.takeaways_title, "Key takeaways");
    documents::write_document(book, "notes", "000-overview.md", overview_title, &overview)?;
    documents::write_document(book, "notes", "900-glossary.md", glossary_title, &output.glossary)?;
    documents::write_document(book, "notes", "901-key-takeaways.md", takeaways_title, &output.takeaways)?;

    let title = Some(output.title.trim()).filter(|t| !t.is_empty()).unwrap_or(&book.title).to_string();
    let author = Some(output.author.trim()).filter(|a| !a.is_empty()).map(String::from).or_else(|| book.author.clone());

    let limit = output.questions.len().min(settings.book_questions as usize);
    db.with(|conn| {
        let tx = conn.transaction()?;
        questions::replace_questions(&tx, &book.id, None, &output.questions[..limit])?;
        tx.execute(
            "UPDATE books SET title = ?2, author = ?3, summary = ?4 WHERE id = ?1",
            params![book.id, title, author, summary],
        )?;
        usage::record(&tx, &book.id, response.cost_usd, response.limits.as_ref())?;
        tx.commit()
    })?;
    Ok(())
}
