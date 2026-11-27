use std::path::{Path, PathBuf};

use anyhow::{bail, Context, Result};
use rusqlite::{params, OptionalExtension, Row};
use serde::Serialize;

use crate::storage::{
    db::{now, Db},
    paths,
};

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Book {
    pub id: String,
    pub title: String,
    pub author: Option<String>,
    pub dir_name: String,
    pub dir: String,
    pub pdf_path: String,
    pub cover_path: Option<String>,
    pub file_name: String,
    pub page_count: i64,
    pub status: String,
    pub stage: Option<String>,
    pub error: Option<String>,
    pub summary: Option<String>,
    pub cost_usd: f64,
    pub created_at: String,
    pub updated_at: String,
    pub sections_total: i64,
    pub sections_done: i64,
    pub question_count: i64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Section {
    pub id: i64,
    pub idx: i64,
    pub title: String,
    pub placeholder: bool,
    pub start_page: i64,
    pub end_page: i64,
    pub word_count: i64,
    pub mode: String,
    pub status: String,
    pub error: Option<String>,
    pub summary: Option<String>,
    pub file_stem: Option<String>,
    pub question_count: i64,
}

pub fn book_dir(dir_name: &str) -> PathBuf {
    paths::books_dir().join(dir_name)
}

const BOOK_SELECT: &str = "SELECT b.id, b.title, b.author, b.dir_name, b.file_name, b.page_count, b.status,
    b.stage, b.error, b.summary, b.cost_usd, b.created_at, b.updated_at,
    (SELECT COUNT(*) FROM sections s WHERE s.book_id = b.id),
    (SELECT COUNT(*) FROM sections s WHERE s.book_id = b.id AND s.status = 'done'),
    (SELECT COUNT(*) FROM questions q WHERE q.book_id = b.id)
    FROM books b";

fn book_from_row(row: &Row) -> rusqlite::Result<Book> {
    let dir_name: String = row.get(3)?;
    let dir = book_dir(&dir_name);
    let cover = dir.join("cover.jpg");
    Ok(Book {
        id: row.get(0)?,
        title: row.get(1)?,
        author: row.get(2)?,
        dir: dir.to_string_lossy().into_owned(),
        pdf_path: dir.join("book.pdf").to_string_lossy().into_owned(),
        cover_path: cover.exists().then(|| cover.to_string_lossy().into_owned()),
        dir_name,
        file_name: row.get(4)?,
        page_count: row.get(5)?,
        status: row.get(6)?,
        stage: row.get(7)?,
        error: row.get(8)?,
        summary: row.get(9)?,
        cost_usd: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
        sections_total: row.get(13)?,
        sections_done: row.get(14)?,
        question_count: row.get(15)?,
    })
}

pub fn list_books(db: &Db) -> Result<Vec<Book>> {
    db.with(|conn| {
        let mut stmt = conn.prepare(&format!("{BOOK_SELECT} ORDER BY b.created_at DESC"))?;
        let rows = stmt.query_map([], book_from_row)?;
        rows.collect()
    })
}

pub fn get_book(db: &Db, id: &str) -> Result<Book> {
    db.with(|conn| conn.query_row(&format!("{BOOK_SELECT} WHERE b.id = ?1"), [id], book_from_row).optional())?
        .context("Book not found")
}

pub fn get_sections(db: &Db, book_id: &str) -> Result<Vec<Section>> {
    db.with(|conn| {
        let mut stmt = conn.prepare(
            "SELECT s.id, s.idx, s.title, s.placeholder, s.start_page, s.end_page, s.word_count, s.mode,
                    s.status, s.error, s.summary, s.file_stem,
                    (SELECT COUNT(*) FROM questions q WHERE q.section_id = s.id)
             FROM sections s WHERE s.book_id = ?1 ORDER BY s.idx",
        )?;
        let rows = stmt.query_map([book_id], |row| {
            Ok(Section {
                id: row.get(0)?,
                idx: row.get(1)?,
                title: row.get(2)?,
                placeholder: row.get(3)?,
                start_page: row.get(4)?,
                end_page: row.get(5)?,
                word_count: row.get(6)?,
                mode: row.get(7)?,
                status: row.get(8)?,
                error: row.get(9)?,
                summary: row.get(10)?,
                file_stem: row.get(11)?,
                question_count: row.get(12)?,
            })
        })?;
        rows.collect()
    })
}

pub fn set_status(db: &Db, id: &str, status: &str, stage: Option<&str>, error: Option<&str>) -> Result<()> {
    db.with(|conn| {
        conn.execute(
            "UPDATE books SET status = ?2, stage = COALESCE(?3, stage), error = ?4, updated_at = ?5 WHERE id = ?1",
            params![id, status, stage, error, now()],
        )
    })?;
    Ok(())
}

/// Deletes a book, its tests and its folder in the library.
/// Copies the library's copy of a book's PDF (`book.pdf` in `dir`) to `destination`,
/// adding a `.pdf` extension when the chosen name has none.
pub fn export_pdf(dir: &Path, destination: &Path) -> Result<PathBuf> {
    let source = dir.join("book.pdf");
    if !source.is_file() {
        bail!("The original PDF is missing from the library");
    }

    let mut destination = destination.to_path_buf();
    let has_pdf_extension = destination.extension().map(|e| e.eq_ignore_ascii_case("pdf")).unwrap_or(false);
    if !has_pdf_extension {
        let mut name = destination.file_name().map(|n| n.to_os_string()).unwrap_or_else(|| "book".into());
        name.push(".pdf");
        destination.set_file_name(name);
    }

    if destination == source {
        return Ok(destination);
    }
    std::fs::copy(&source, &destination).with_context(|| format!("saving {}", destination.display()))?;
    Ok(destination)
}

pub fn delete_book(db: &Db, id: &str) -> Result<()> {
    let book = get_book(db, id)?;
    db.with(|conn| conn.execute("DELETE FROM books WHERE id = ?1", [id]))?;

    let dir = PathBuf::from(&book.dir);
    if dir.starts_with(paths::books_dir()) && dir != paths::books_dir() && dir.exists() {
        std::fs::remove_dir_all(&dir)?;
    }
    Ok(())
}

/// Called on startup. Imports that never finished extracting are discarded,
/// sections that were being parsed go back to pending, and the ids of books
/// whose parsing was interrupted by quitting are returned so they can continue.
/// Books the user paused stay paused.
pub fn recover_interrupted(db: &Db) -> Result<Vec<String>> {
    let importing: Vec<String> = db.with(|conn| {
        let mut stmt = conn.prepare("SELECT id FROM books WHERE status = 'importing'")?;
        let rows = stmt.query_map([], |r| r.get(0))?;
        rows.collect()
    })?;
    for id in importing {
        let _ = delete_book(db, &id);
    }

    db.with(|conn| {
        conn.execute("UPDATE sections SET status = 'pending' WHERE status = 'processing'", [])?;

        let mut stmt = conn.prepare("SELECT id FROM books WHERE status IN ('processing', 'queued')")?;
        let rows = stmt.query_map([], |r| r.get(0))?;
        rows.collect()
    })
}
