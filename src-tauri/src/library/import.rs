use std::path::Path;

use anyhow::{bail, Context, Result};
use base64::Engine;
use rusqlite::{params, Transaction};
use serde::Deserialize;

use crate::{
    library::{
        books::{book_dir, get_book, Book},
        sections::{self, OutlineEntry, PlannedSection},
    },
    storage::{
        db::{now, Db},
        paths,
    },
};

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ImportPayload {
    pub title: Option<String>,
    pub author: Option<String>,
    pub pages: Vec<String>,
    #[serde(default)]
    pub outline: Vec<OutlineEntry>,
    pub cover_jpeg: Option<String>,
}

/// Step 1 of importing: copy the PDF into the library and create the record.
pub fn create_book(db: &Db, source: &Path) -> Result<Book> {
    if !source.is_file() {
        bail!("{} is not a file", source.display());
    }
    let is_pdf = source.extension().map(|e| e.eq_ignore_ascii_case("pdf")).unwrap_or(false);
    if !is_pdf {
        bail!("Only PDF files are supported");
    }

    let file_name = source.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_else(|| "book.pdf".into());
    let stem = source.file_stem().map(|n| n.to_string_lossy().into_owned()).unwrap_or_else(|| "Untitled".into());
    let title = stem.replace(['_', '-'], " ").trim().to_string();

    let id = uuid::Uuid::new_v4().simple().to_string();
    let dir_name = format!("{}-{}", paths::slugify(&stem, 48), &id[..6]);
    let dir = book_dir(&dir_name);
    std::fs::create_dir_all(&dir)?;
    std::fs::copy(source, dir.join("book.pdf")).with_context(|| format!("copying {}", source.display()))?;

    let created_at = now();
    db.with(|conn| {
        conn.execute(
            "INSERT INTO books (id, title, dir_name, file_name, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, 'importing', ?5, ?5)",
            params![id, title, dir_name, file_name, created_at],
        )
    })?;

    get_book(db, &id)
}

/// Normalises whitespace of an extracted PDF page.
pub fn clean_page(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut blank_lines = 0;

    for line in text.lines() {
        let line = line.split_whitespace().collect::<Vec<_>>().join(" ");
        if line.is_empty() {
            blank_lines += 1;
            if blank_lines > 1 {
                continue;
            }
        } else {
            blank_lines = 0;
        }
        out.push_str(&line);
        out.push('\n');
    }

    out.trim().to_string()
}

/// Saves the extracted text, outline and cover next to the book's PDF.
fn write_source_files(dir: &Path, pages: &[String], payload: &ImportPayload) -> Result<()> {
    let source = dir.join("source");
    std::fs::create_dir_all(&source)?;
    std::fs::write(source.join("pages.json"), serde_json::to_vec(pages)?)?;

    let outline: Vec<serde_json::Value> =
        payload.outline.iter().map(|e| serde_json::json!({ "title": e.title, "page": e.page })).collect();
    std::fs::write(source.join("outline.json"), serde_json::to_vec_pretty(&outline)?)?;

    if let Some(cover) = payload.cover_jpeg.as_deref() {
        if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(cover) {
            std::fs::write(dir.join("cover.jpg"), bytes)?;
        }
    }
    Ok(())
}

/// Stores the planned sections of a book, replacing any previous plan.
fn insert_sections(tx: &Transaction, book_id: &str, plan: &[PlannedSection]) -> rusqlite::Result<()> {
    tx.execute("DELETE FROM sections WHERE book_id = ?1", [book_id])?;

    for (idx, section) in plan.iter().enumerate() {
        tx.execute(
            "INSERT INTO sections (book_id, idx, title, placeholder, start_page, end_page, word_count, mode)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                book_id,
                idx as i64,
                section.title,
                section.placeholder,
                section.start_page as i64,
                section.end_page as i64,
                section.word_count as i64,
                section.mode
            ],
        )?;
    }
    Ok(())
}

/// Step 2 of importing: store the text extracted by the frontend (pdf.js) and
/// plan the sections that will be sent to Claude.
pub fn finish_import(db: &Db, id: &str, payload: ImportPayload) -> Result<Book> {
    let book = get_book(db, id)?;
    if book.status != "importing" {
        bail!("Book was already imported");
    }

    let pages: Vec<String> = payload.pages.iter().map(|p| clean_page(p)).collect();
    if pages.is_empty() {
        bail!("The PDF has no pages");
    }
    write_source_files(Path::new(&book.dir), &pages, &payload)?;

    let plan = sections::plan(&pages, &payload.outline);
    let title = payload.title.map(|t| t.trim().to_string()).filter(|t| t.chars().count() > 1).unwrap_or(book.title);
    let author = payload.author.map(|a| a.trim().to_string()).filter(|a| !a.is_empty());
    let page_count = pages.len() as i64;

    db.with(|conn| {
        let tx = conn.transaction()?;
        insert_sections(&tx, id, &plan)?;
        tx.execute(
            "UPDATE books SET title = ?2, author = ?3, page_count = ?4, status = 'queued', stage = 'sections',
             error = NULL, updated_at = ?5 WHERE id = ?1",
            params![id, title, author, page_count, now()],
        )?;
        tx.commit()
    })?;

    get_book(db, id)
}

/// Extracted text of every page of a book.
pub fn read_pages(book: &Book) -> Result<Vec<String>> {
    let raw = std::fs::read(Path::new(&book.dir).join("source/pages.json")).context("reading extracted text")?;
    Ok(serde_json::from_slice(&raw)?)
}
