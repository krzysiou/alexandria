use std::path::PathBuf;

use anyhow::{Context, Result};

pub fn home_dir() -> PathBuf {
    std::env::var_os("HOME").map(PathBuf::from).unwrap_or_else(|| PathBuf::from("/"))
}

/// Root of everything Alexandria stores: `~/.alexandria`.
/// `ALEXANDRIA_HOME` overrides it (useful for development and tests).
pub fn data_dir() -> PathBuf {
    match std::env::var_os("ALEXANDRIA_HOME") {
        Some(dir) if !dir.is_empty() => PathBuf::from(dir),
        _ => home_dir().join(".alexandria"),
    }
}

pub fn books_dir() -> PathBuf {
    data_dir().join("books")
}

pub fn run_dir() -> PathBuf {
    data_dir().join("run")
}

pub fn database_path() -> PathBuf {
    data_dir().join("alexandria.db")
}

pub fn ensure_data_dir() -> Result<PathBuf> {
    let root = data_dir();
    for dir in [root.clone(), books_dir(), run_dir()] {
        std::fs::create_dir_all(&dir).with_context(|| format!("creating {}", dir.display()))?;
    }
    Ok(root)
}

/// Lowercase, filesystem-friendly slug. Keeps unicode letters so non-English
/// titles stay readable in Finder.
pub fn slugify(input: &str, max_len: usize) -> String {
    let mut slug = String::new();
    let mut dash = false;
    for ch in input.chars().flat_map(char::to_lowercase) {
        if ch.is_alphanumeric() {
            slug.push(ch);
            dash = false;
        } else if !dash && !slug.is_empty() {
            slug.push('-');
            dash = true;
        }
        if slug.chars().count() >= max_len {
            break;
        }
    }
    let slug = slug.trim_matches('-').to_string();
    if slug.is_empty() {
        "untitled".to_string()
    } else {
        slug
    }
}
