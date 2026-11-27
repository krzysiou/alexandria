use serde::Deserialize;

const TARGET_WORDS: usize = 7_000;
pub const MAX_WORDS: usize = 12_000;
const MIN_WORDS: usize = 1_500;
const SCANNED_WORDS_PER_PAGE: usize = 25;
const VISION_PAGES: usize = 15;

#[derive(Deserialize, Debug, Clone)]
pub struct OutlineEntry {
    pub title: String,
    pub page: usize,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PlannedSection {
    pub title: String,
    pub placeholder: bool,
    pub start_page: usize,
    pub end_page: usize,
    pub word_count: usize,
    pub mode: &'static str,
}

pub fn word_count(text: &str) -> usize {
    text.split_whitespace().count()
}

fn pages_title(start: usize, end: usize) -> String {
    if start == end {
        format!("Page {start}")
    } else {
        format!("Pages {start}–{end}")
    }
}

struct Range {
    title: Option<String>,
    start: usize,
    end: usize,
    words: usize,
}

pub fn plan(pages: &[String], outline: &[OutlineEntry]) -> Vec<PlannedSection> {
    let page_count = pages.len();
    if page_count == 0 {
        return Vec::new();
    }
    let words: Vec<usize> = pages.iter().map(|p| word_count(p)).collect();
    let total: usize = words.iter().sum();
    let words_in = |start: usize, end: usize| -> usize { words[start - 1..end].iter().sum() };

    if total < page_count * SCANNED_WORDS_PER_PAGE {
        return (1..=page_count)
            .step_by(VISION_PAGES)
            .map(|start| {
                let end = (start + VISION_PAGES - 1).min(page_count);
                PlannedSection {
                    title: pages_title(start, end),
                    placeholder: true,
                    start_page: start,
                    end_page: end,
                    word_count: words_in(start, end),
                    mode: "vision",
                }
            })
            .collect();
    }

    let mut starts: Vec<(usize, String)> = outline
        .iter()
        .filter(|e| e.page >= 1 && e.page <= page_count && !e.title.trim().is_empty())
        .map(|e| (e.page, e.title.trim().to_string()))
        .collect();
    starts.sort_by_key(|(page, _)| *page);
    starts.dedup_by_key(|(page, _)| *page);

    let mut ranges: Vec<Range> = Vec::new();
    if starts.len() >= 2 {
        if starts[0].0 > 1 {
            starts.insert(0, (1, String::new()));
        }
        for (i, (start, title)) in starts.iter().enumerate() {
            let end = starts.get(i + 1).map(|(next, _)| next - 1).unwrap_or(page_count);
            ranges.push(Range {
                title: (!title.is_empty()).then(|| title.clone()),
                start: *start,
                end,
                words: words_in(*start, end),
            });
        }
    } else {
        ranges.push(Range { title: None, start: 1, end: page_count, words: total });
    }

    let mut merged: Vec<Range> = Vec::new();
    for range in ranges {
        match merged.last_mut() {
            Some(last) if last.words < MIN_WORDS => {
                last.title = match (last.title.take(), range.title) {
                    (Some(a), Some(b)) => Some(format!("{a} · {b}")),
                    (a, b) => a.or(b),
                };
                last.end = range.end;
                last.words += range.words;
            }
            _ => merged.push(range),
        }
    }
    if merged.len() > 1 && merged.last().is_some_and(|r| r.words < MIN_WORDS) {
        let tail = merged.pop().expect("checked above");
        let last = merged.last_mut().expect("len > 1");
        last.end = tail.end;
        last.words += tail.words;
    }

    let mut planned = Vec::new();
    for range in merged {
        let parts = if range.words > MAX_WORDS { range.words.div_ceil(TARGET_WORDS) } else { 1 };
        let part_target = range.words.div_ceil(parts.max(1));
        let mut chunks: Vec<(usize, usize, usize)> = Vec::new();
        let mut start = range.start;
        let mut acc = 0;
        for page in range.start..=range.end {
            acc += words[page - 1];
            let remaining_parts = parts - chunks.len();
            if acc >= part_target && remaining_parts > 1 && page < range.end {
                chunks.push((start, page, acc));
                start = page + 1;
                acc = 0;
            }
        }
        chunks.push((start, range.end, acc));

        let count = chunks.len();
        for (i, (start, end, words)) in chunks.into_iter().enumerate() {
            let (title, placeholder) = match &range.title {
                Some(t) if count > 1 => (format!("{t} (part {} of {count})", i + 1), false),
                Some(t) => (t.clone(), t.contains(" · ")),
                None => (pages_title(start, end), true),
            };
            planned.push(PlannedSection {
                title,
                placeholder,
                start_page: start,
                end_page: end,
                word_count: words,
                mode: "text",
            });
        }
    }
    planned
}
