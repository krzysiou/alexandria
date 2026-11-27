use anyhow::Result;
use serde::Serialize;

use crate::{
    library::{books, documents},
    storage::db::Db,
};

const KINDS: [&str; 2] = ["notes", "key-data"];
const MIN_QUERY_CHARS: usize = 2;
const MAX_HITS: usize = 50;
const SNIPPET_RADIUS: usize = 90;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub book_id: String,
    pub book_title: String,
    pub kind: String,
    pub file: String,
    pub title: String,
    pub snippet: String,
    pub score: usize,
}

/// Lowercase search terms of a query; empty when the query is too short.
pub fn terms(query: &str) -> Vec<String> {
    let query = query.trim();
    if query.chars().count() < MIN_QUERY_CHARS {
        return Vec::new();
    }
    query.split_whitespace().map(str::to_lowercase).collect()
}

/// Markdown as plain text: syntax characters removed, whitespace collapsed.
pub fn plain_text(markdown: &str) -> String {
    let stripped: String = markdown
        .lines()
        .map(|line| line.trim_start_matches(['#', '>', '-', '|', ' ']))
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .filter(|c| !matches!(c, '*' | '_' | '`' | '|'))
        .collect();

    stripped.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// How often all `terms` occur in `text` (already lowercase), or None when
/// any of them is missing.
fn score(text: &str, terms: &[String]) -> Option<usize> {
    terms.iter().try_fold(0, |total, term| match text.matches(term.as_str()).count() {
        0 => None,
        count => Some(total + count),
    })
}

/// A short excerpt around the first match of the first term.
pub fn snippet(plain: &str, terms: &[String]) -> String {
    let chars: Vec<char> = plain.chars().collect();
    let lower: Vec<char> = chars.iter().map(|c| c.to_lowercase().next().unwrap_or(*c)).collect();
    let needle: Vec<char> = terms.first().map(|t| t.chars().collect()).unwrap_or_default();

    let position = if needle.is_empty() {
        0
    } else {
        lower.windows(needle.len()).position(|window| window == needle.as_slice()).unwrap_or(0)
    };

    let start = position.saturating_sub(SNIPPET_RADIUS);
    let end = (position + needle.len() + SNIPPET_RADIUS).min(chars.len());
    let excerpt: String = chars[start..end].iter().collect();

    let prefix = if start > 0 { "…" } else { "" };
    let suffix = if end < chars.len() { "…" } else { "" };
    format!("{prefix}{}{suffix}", excerpt.trim())
}

/// Full-text search over the notes and key data of every book. All terms
/// must appear in a document; results are ordered by number of matches.
pub fn search(db: &Db, query: &str) -> Result<Vec<SearchHit>> {
    let terms = terms(query);
    if terms.is_empty() {
        return Ok(Vec::new());
    }

    let mut hits = Vec::new();
    for book in books::list_books(db)? {
        for kind in KINDS {
            for doc in documents::list_documents(&book, kind)? {
                let Ok(markdown) = documents::read_document(&book, kind, &doc.file) else {
                    continue;
                };

                let plain = plain_text(&markdown);
                let Some(score) = score(&plain.to_lowercase(), &terms) else {
                    continue;
                };

                hits.push(SearchHit {
                    book_id: book.id.clone(),
                    book_title: book.title.clone(),
                    kind: kind.to_string(),
                    file: doc.file,
                    title: doc.title,
                    snippet: snippet(&plain, &terms),
                    score,
                });
            }
        }
    }

    hits.sort_by_key(|hit| std::cmp::Reverse(hit.score));
    hits.truncate(MAX_HITS);
    Ok(hits)
}
