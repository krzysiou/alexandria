use std::path::Path;

use anyhow::Result;
use rusqlite::OptionalExtension;

use crate::{
    library::{books::Book, documents},
    storage::db::Db,
    study::attempts::{self, AttemptDetail, AttemptItem},
};

type BankRow = (Option<String>, String, String, String, String, String, String);

/// Human label of a question kind.
fn kind_label(kind: &str) -> &'static str {
    match kind {
        "multiple_choice" => "Multiple choice",
        "true_false" => "True / false",
        _ => "Open question",
    }
}

/// Display text of a stored answer ("2" becomes the option text, "true" becomes "True").
fn answer_text(kind: &str, options: &[String], value: &str) -> String {
    match kind {
        "multiple_choice" => {
            value.parse::<usize>().ok().and_then(|i| options.get(i).cloned()).unwrap_or_else(|| value.to_string())
        }
        "true_false" => match value {
            "true" => "True".into(),
            "false" => "False".into(),
            other => other.into(),
        },
        _ => value.to_string(),
    }
}

/// `results/2026-11-26-18-30-1a2b3c4d.md`
pub fn results_file_name(started_at: &str, attempt_id: &str) -> String {
    let date: String = started_at.chars().take(16).collect::<String>().replace([':', 'T'], "-");
    format!("{date}-{}.md", &attempt_id[..attempt_id.len().min(8)])
}

/// Markdown for one question of the question bank.
fn bank_question(
    number: usize,
    kind: &str,
    difficulty: &str,
    prompt: &str,
    options: &[String],
    answer: &str,
) -> String {
    let mut md = format!("\n### {number}. {prompt}\n\n*{} · {difficulty}*\n\n", kind_label(kind));

    for (i, option) in options.iter().enumerate() {
        md.push_str(&format!("{}. {option}\n", (b'A' + i as u8) as char));
    }
    if !options.is_empty() {
        md.push('\n');
    }

    md.push_str(&format!("**Answer:** {}\n", answer_text(kind, options, answer)));
    md
}

/// Writes `tests/question-bank.md` so the question bank is readable outside the app.
pub fn export_question_bank(db: &Db, book: &Book) -> Result<()> {
    let rows: Vec<BankRow> = db.with(|conn| {
        let mut stmt = conn.prepare(
            "SELECT s.title, q.kind, q.difficulty, q.prompt, q.options, q.answer, q.explanation
             FROM questions q LEFT JOIN sections s ON s.id = q.section_id
             WHERE q.book_id = ?1 ORDER BY s.idx IS NULL, s.idx, q.id",
        )?;
        let rows = stmt.query_map([&book.id], |r| {
            Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?, r.get(6)?))
        })?;
        rows.collect()
    })?;

    let mut md = format!("{} questions generated from the book.\n", rows.len());
    let mut current_heading: Option<String> = None;
    let mut number = 0;

    for (section, kind, difficulty, prompt, options, answer, explanation) in rows {
        let heading = section.unwrap_or_else(|| "Whole book".into());
        if current_heading.as_deref() != Some(heading.as_str()) {
            md.push_str(&format!("\n## {heading}\n"));
            current_heading = Some(heading);
            number = 0;
        }

        number += 1;
        let options: Vec<String> = serde_json::from_str(&options).unwrap_or_default();
        md.push_str(&bank_question(number, &kind, &difficulty, &prompt, &options, &answer));
        if !explanation.is_empty() {
            md.push_str(&format!("\n> {explanation}\n"));
        }
    }

    documents::write_document(book, "tests", "question-bank.md", &format!("Question bank — {}", book.title), &md)
}

/// Markdown for one answered question of a test.
fn result_item(item: &AttemptItem) -> String {
    let mark = match item.score {
        Some(score) if score >= 1.0 => "✅",
        Some(score) if score > 0.0 => "🟡",
        Some(_) => "❌",
        None => "⏳",
    };
    let response = item
        .response
        .as_deref()
        .filter(|r| !r.trim().is_empty())
        .map(|r| answer_text(&item.kind, &item.options, r))
        .unwrap_or_else(|| "*(no answer)*".into());
    let correct = answer_text(&item.kind, &item.options, item.answer.as_deref().unwrap_or_default());
    let section = item.section_title.as_deref().map(|t| format!(" · {t}")).unwrap_or_default();

    let mut md = format!(
        "\n## {mark} {}. {}\n\n*{}{section}*\n\n**Your answer:** {response}\n\n**Correct answer:** {correct}\n",
        item.position + 1,
        item.prompt,
        kind_label(&item.kind),
    );
    if let Some(explanation) = item.explanation.as_deref().filter(|e| !e.is_empty()) {
        md.push_str(&format!("\n> {explanation}\n"));
    }
    md
}

/// Writes `results/<date>-<id>.md` for a submitted test.
pub fn export_attempt(book: &Book, attempt: &AttemptDetail) -> Result<()> {
    if attempt.status == "in_progress" {
        return Ok(());
    }

    let percent = attempt.score.map(|s| format!("{:.0}%", s * 100.0)).unwrap_or_else(|| "—".into());
    let points: f64 = attempt.items.iter().filter_map(|i| i.score).sum();
    let status = if attempt.status == "graded" { "graded" } else { "awaiting self-review" };

    let mut md = format!(
        "- **Date:** {}\n- **Score:** {percent} ({points} / {} points)\n- **Status:** {status}\n",
        attempt.started_at,
        attempt.items.len(),
    );
    for item in &attempt.items {
        md.push_str(&result_item(item));
    }

    let file = results_file_name(&attempt.started_at, &attempt.id);
    documents::write_document(book, "results", &file, &format!("Test results — {}", book.title), &md)
}

/// Deletes a test together with its exported results file.
pub fn delete_attempt_with_file(db: &Db, book: &Book, attempt_id: &str) -> Result<()> {
    let started_at: Option<String> = db.with(|conn| {
        conn.query_row("SELECT started_at FROM attempts WHERE id = ?1", [attempt_id], |r| r.get(0)).optional()
    })?;

    attempts::delete_attempt(db, attempt_id)?;

    if let Some(started_at) = started_at {
        let file = Path::new(&book.dir).join("results").join(results_file_name(&started_at, attempt_id));
        let _ = std::fs::remove_file(file);
    }
    Ok(())
}
