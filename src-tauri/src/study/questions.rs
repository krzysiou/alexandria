use rusqlite::{params, Transaction};
use serde::Deserialize;

use crate::storage::db::now;

pub const KINDS: [&str; 3] = ["multiple_choice", "true_false", "short_answer"];

#[derive(Deserialize, Debug, Clone)]
pub struct GeneratedQuestion {
    pub kind: String,
    #[serde(default)]
    pub difficulty: String,
    pub question: String,
    #[serde(default)]
    pub options: Vec<String>,
    pub answer: String,
    #[serde(default)]
    pub explanation: String,
}

#[derive(Debug, PartialEq)]
pub struct NormalizedQuestion {
    pub kind: &'static str,
    pub difficulty: &'static str,
    pub prompt: String,
    pub options: Vec<String>,
    pub answer: String,
    pub explanation: String,
}

/// Maps any difficulty label to easy, medium or hard (medium by default).
fn difficulty_of(label: &str) -> &'static str {
    match label.trim().to_lowercase().as_str() {
        "easy" => "easy",
        "hard" => "hard",
        _ => "medium",
    }
}

/// Trimmed, non-empty options without case-insensitive duplicates.
fn unique_options(options: &[String]) -> Vec<String> {
    let mut unique: Vec<String> = Vec::new();
    for option in options.iter().map(|o| o.trim()).filter(|o| !o.is_empty()) {
        if !unique.iter().any(|o| o.eq_ignore_ascii_case(option)) {
            unique.push(option.to_string());
        }
    }
    unique
}

/// Index of the correct option: the answer is the option text, or a letter
/// such as "B", "B)" or "B.".
fn correct_index(options: &[String], answer: &str) -> Option<usize> {
    if let Some(index) = options.iter().position(|o| o.eq_ignore_ascii_case(answer)) {
        return Some(index);
    }

    let mut chars = answer.chars();
    let letter = chars.next()?.to_ascii_uppercase();
    let rest = chars.as_str().trim();
    let letter_only = rest.is_empty() || rest == ")" || rest == ".";

    (letter.is_ascii_uppercase() && letter_only)
        .then(|| (letter as u8 - b'A') as usize)
        .filter(|index| *index < options.len())
}

/// Shuffles the options so the correct answer isn't always in the same slot.
/// Returns the shuffled options and the new index of the correct one.
fn shuffle_options(options: Vec<String>, correct: usize) -> Option<(Vec<String>, usize)> {
    let mut order: Vec<usize> = (0..options.len()).collect();
    fastrand::shuffle(&mut order);

    let new_index = order.iter().position(|i| *i == correct)?;
    let shuffled = order.into_iter().map(|i| options[i].clone()).collect();
    Some((shuffled, new_index))
}

/// Validates a question written by Claude and converts it to the stored form.
/// Multiple-choice answers become an option index, true/false answers become
/// "true"/"false". Returns None for questions that cannot be graded reliably.
pub fn normalize(question: &GeneratedQuestion) -> Option<NormalizedQuestion> {
    let prompt = question.question.trim().to_string();
    if prompt.is_empty() {
        return None;
    }

    let answer = question.answer.trim();
    let build = |kind, options, answer: String| NormalizedQuestion {
        kind,
        difficulty: difficulty_of(&question.difficulty),
        prompt: prompt.clone(),
        options,
        answer,
        explanation: question.explanation.trim().to_string(),
    };

    match question.kind.trim() {
        "multiple_choice" => {
            let options = unique_options(&question.options);
            if !(2..=6).contains(&options.len()) {
                return None;
            }

            let correct = correct_index(&options, answer)?;
            let (options, index) = shuffle_options(options, correct)?;
            Some(build("multiple_choice", options, index.to_string()))
        }
        "true_false" => {
            let value = match answer.to_lowercase().as_str() {
                "true" | "t" | "yes" => "true",
                "false" | "f" | "no" => "false",
                _ => return None,
            };
            Some(build("true_false", Vec::new(), value.to_string()))
        }
        "short_answer" if !answer.is_empty() => Some(build("short_answer", Vec::new(), answer.to_string())),
        _ => None,
    }
}

/// Replaces the questions of one section (or the whole-book questions when
/// `section_id` is None). Returns how many valid questions were stored.
pub fn replace_questions(
    tx: &Transaction,
    book_id: &str,
    section_id: Option<i64>,
    questions: &[GeneratedQuestion],
) -> rusqlite::Result<usize> {
    match section_id {
        Some(id) => tx.execute("DELETE FROM questions WHERE section_id = ?1", [id])?,
        None => tx.execute("DELETE FROM questions WHERE book_id = ?1 AND section_id IS NULL", [book_id])?,
    };

    let created_at = now();
    let mut stored = 0;
    for question in questions.iter().filter_map(normalize) {
        let options = serde_json::to_string(&question.options).unwrap_or_else(|_| "[]".into());
        tx.execute(
            "INSERT INTO questions (book_id, section_id, kind, difficulty, prompt, options, answer, explanation, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                book_id,
                section_id,
                question.kind,
                question.difficulty,
                question.prompt,
                options,
                question.answer,
                question.explanation,
                created_at
            ],
        )?;
        stored += 1;
    }
    Ok(stored)
}
