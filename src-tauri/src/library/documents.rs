use std::path::{Path, PathBuf};

use anyhow::{bail, Context, Result};
use serde::Serialize;

use crate::library::books::Book;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DocumentInfo {
    pub file: String,
    pub title: String,
    pub group: String,
}

fn document_dir(book: &Book, kind: &str) -> Result<PathBuf> {
    match kind {
        "notes" | "key-data" | "tests" | "results" => Ok(Path::new(&book.dir).join(kind)),
        _ => bail!("Unknown document kind"),
    }
}

fn markdown_title(content: &str, fallback: &str) -> String {
    content
        .lines()
        .find_map(|l| l.strip_prefix("# "))
        .map(|t| t.trim().to_string())
        .unwrap_or_else(|| fallback.to_string())
}

pub fn list_documents(book: &Book, kind: &str) -> Result<Vec<DocumentInfo>> {
    let dir = document_dir(book, kind)?;
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return Ok(Vec::new());
    };
    let mut files: Vec<String> =
        entries.flatten().filter_map(|e| e.file_name().into_string().ok()).filter(|n| n.ends_with(".md")).collect();
    files.sort();
    Ok(files
        .into_iter()
        .map(|file| {
            let content = std::fs::read_to_string(dir.join(&file)).unwrap_or_default();
            let group = if file.starts_with("000") || file.starts_with('9') { "Book" } else { "Sections" }.to_string();
            DocumentInfo { title: markdown_title(&content, &file), file, group }
        })
        .collect())
}

pub fn read_document(book: &Book, kind: &str, file: &str) -> Result<String> {
    if file.contains('/') || file.contains("..") || !file.ends_with(".md") {
        bail!("Invalid document name");
    }
    let path = document_dir(book, kind)?.join(file);
    std::fs::read_to_string(&path).with_context(|| format!("reading {file}"))
}

pub fn write_document(book: &Book, kind: &str, file: &str, title: &str, body: &str) -> Result<()> {
    let dir = document_dir(book, kind)?;
    std::fs::create_dir_all(&dir)?;
    let body = strip_leading_h1(body.trim());
    std::fs::write(dir.join(file), format!("# {title}\n\n{body}\n"))?;
    Ok(())
}

/// The model sometimes repeats the title as `# Title`; we add our own.
pub fn strip_leading_h1(body: &str) -> &str {
    if body.starts_with("# ") {
        body.split_once('\n').map(|(_, rest)| rest.trim_start()).unwrap_or("")
    } else {
        body
    }
}
