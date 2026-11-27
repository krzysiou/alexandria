use anyhow::{bail, Context, Result};
use rusqlite::{params, params_from_iter, types::Value as SqlValue, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};

use crate::{
    storage::db::{now, Db},
    study::questions::KINDS,
};

const MAX_QUESTIONS: u32 = 200;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StartOptions {
    #[serde(default)]
    pub section_ids: Vec<i64>,
    #[serde(default = "enabled")]
    pub include_book: bool,
    pub count: u32,
    #[serde(default)]
    pub kinds: Vec<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ResponseInput {
    pub question_id: i64,
    pub response: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AttemptItem {
    pub question_id: i64,
    pub position: i64,
    pub kind: String,
    pub difficulty: String,
    pub prompt: String,
    pub options: Vec<String>,
    pub section_title: Option<String>,
    pub response: Option<String>,
    pub score: Option<f64>,
    pub answer: Option<String>,
    pub explanation: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AttemptDetail {
    pub id: String,
    pub book_id: String,
    pub book_title: String,
    pub status: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub score: Option<f64>,
    pub question_count: i64,
    pub items: Vec<AttemptItem>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AttemptSummary {
    pub id: String,
    pub status: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub score: Option<f64>,
    pub question_count: i64,
}

/// Serde default for options that are on unless the frontend says otherwise.
fn enabled() -> bool {
    true
}

/// `?, ?, ?` with `count` placeholders.
fn placeholders(count: usize) -> String {
    vec!["?"; count].join(", ")
}

/// Builds the query picking the questions of a new test: questions never
/// answered come first, then the ones answered worst; ties are random.
fn selection_query(book_id: &str, opts: &StartOptions, kinds: &[String]) -> (String, Vec<SqlValue>) {
    let mut sql =
        format!("SELECT q.id FROM questions q WHERE q.book_id = ? AND q.kind IN ({})", placeholders(kinds.len()));
    let mut args = vec![SqlValue::Text(book_id.to_string())];
    args.extend(kinds.iter().cloned().map(SqlValue::Text));

    let mut scope = Vec::new();
    if opts.section_ids.is_empty() {
        scope.push("q.section_id IS NOT NULL".to_string());
    } else {
        scope.push(format!("q.section_id IN ({})", placeholders(opts.section_ids.len())));
        args.extend(opts.section_ids.iter().copied().map(SqlValue::Integer));
    }
    if opts.include_book {
        scope.push("q.section_id IS NULL".to_string());
    }
    sql.push_str(&format!(" AND ({})", scope.join(" OR ")));

    sql.push_str(
        " ORDER BY COALESCE((SELECT AVG(a.score) FROM attempt_answers a
            WHERE a.question_id = q.id AND a.score IS NOT NULL), -1), RANDOM()",
    );

    sql.push_str(" LIMIT ?");
    args.push(SqlValue::Integer(opts.count.clamp(1, MAX_QUESTIONS) as i64));
    (sql, args)
}

/// Creates a test from the question bank and returns its id.
pub fn start_attempt(db: &Db, book_id: &str, opts: StartOptions) -> Result<String> {
    let kinds: Vec<String> = if opts.kinds.is_empty() {
        KINDS.iter().map(|k| k.to_string()).collect()
    } else {
        opts.kinds.iter().filter(|k| KINDS.contains(&k.as_str())).cloned().collect()
    };
    if kinds.is_empty() {
        bail!("Choose at least one question type");
    }

    let (sql, args) = selection_query(book_id, &opts, &kinds);
    let attempt_id = uuid::Uuid::new_v4().simple().to_string();
    let scope = serde_json::json!({
        "sectionIds": opts.section_ids,
        "includeBook": opts.include_book,
        "kinds": kinds,
    })
    .to_string();

    let picked = db.with(|conn| {
        let tx = conn.transaction()?;
        let mut ids: Vec<i64> = {
            let mut stmt = tx.prepare(&sql)?;
            let rows = stmt.query_map(params_from_iter(args.iter()), |r| r.get(0))?;
            rows.collect::<rusqlite::Result<_>>()?
        };
        if ids.is_empty() {
            return Ok(0);
        }

        fastrand::shuffle(&mut ids);
        tx.execute(
            "INSERT INTO attempts (id, book_id, status, scope, question_count, started_at)
             VALUES (?1, ?2, 'in_progress', ?3, ?4, ?5)",
            params![attempt_id, book_id, scope, ids.len() as i64, now()],
        )?;
        for (position, question_id) in ids.iter().enumerate() {
            tx.execute(
                "INSERT INTO attempt_answers (attempt_id, question_id, position) VALUES (?1, ?2, ?3)",
                params![attempt_id, question_id, position as i64],
            )?;
        }

        tx.commit()?;
        Ok(ids.len())
    })?;

    if picked == 0 {
        bail!("No questions match these settings");
    }
    Ok(attempt_id)
}

/// A test with its questions. Correct answers and explanations are only
/// included once the test has been submitted.
pub fn get_attempt(db: &Db, attempt_id: &str) -> Result<AttemptDetail> {
    db.with(|conn| {
        let head = conn
            .query_row(
                "SELECT a.id, a.book_id, b.title, a.status, a.started_at, a.finished_at, a.score, a.question_count
                 FROM attempts a JOIN books b ON b.id = a.book_id WHERE a.id = ?1",
                [attempt_id],
                |r| {
                    Ok(AttemptDetail {
                        id: r.get(0)?,
                        book_id: r.get(1)?,
                        book_title: r.get(2)?,
                        status: r.get(3)?,
                        started_at: r.get(4)?,
                        finished_at: r.get(5)?,
                        score: r.get(6)?,
                        question_count: r.get(7)?,
                        items: Vec::new(),
                    })
                },
            )
            .optional()?;
        let Some(mut detail) = head else {
            return Ok(None);
        };

        let reveal = detail.status != "in_progress";
        let mut stmt = conn.prepare(
            "SELECT q.id, aa.position, q.kind, q.difficulty, q.prompt, q.options, s.title,
                    aa.response, aa.score, q.answer, q.explanation
             FROM attempt_answers aa
             JOIN questions q ON q.id = aa.question_id
             LEFT JOIN sections s ON s.id = q.section_id
             WHERE aa.attempt_id = ?1 ORDER BY aa.position",
        )?;
        let rows = stmt.query_map([attempt_id], |r| {
            let options: String = r.get(5)?;
            Ok(AttemptItem {
                question_id: r.get(0)?,
                position: r.get(1)?,
                kind: r.get(2)?,
                difficulty: r.get(3)?,
                prompt: r.get(4)?,
                options: serde_json::from_str(&options).unwrap_or_default(),
                section_title: r.get(6)?,
                response: r.get(7)?,
                score: r.get(8)?,
                answer: if reveal { r.get(9)? } else { None },
                explanation: if reveal { r.get(10)? } else { None },
            })
        })?;

        detail.items = rows.collect::<rusqlite::Result<_>>()?;
        Ok(Some(detail))
    })?
    .context("Test not found")
}

/// Saves one answer while the test is still in progress.
pub fn save_response(db: &Db, attempt_id: &str, question_id: i64, response: Option<String>) -> Result<()> {
    db.with(|conn| {
        conn.execute(
            "UPDATE attempt_answers SET response = ?3
             WHERE attempt_id = ?1 AND question_id = ?2
               AND (SELECT status FROM attempts WHERE id = ?1) = 'in_progress'",
            params![attempt_id, question_id, response],
        )
    })?;
    Ok(())
}

/// Score of an automatically graded answer; None when the learner grades it.
pub fn auto_score(kind: &str, answer: &str, response: Option<&str>) -> Option<f64> {
    let response = response.map(str::trim).filter(|r| !r.is_empty());

    match (kind, response) {
        (_, None) => Some(0.0),
        ("short_answer", Some(_)) => None,
        (_, Some(r)) => Some(if r.eq_ignore_ascii_case(answer) { 1.0 } else { 0.0 }),
    }
}

/// Recomputes status and score of a test after grading changes. A test stays
/// in "review" until every open answer has been self-graded.
fn refresh_attempt(tx: &Transaction, attempt_id: &str) -> rusqlite::Result<()> {
    let (ungraded, total, sum): (i64, i64, f64) = tx.query_row(
        "SELECT SUM(score IS NULL), COUNT(*), COALESCE(SUM(score), 0) FROM attempt_answers WHERE attempt_id = ?1",
        [attempt_id],
        |r| Ok((r.get::<_, Option<i64>>(0)?.unwrap_or(0), r.get(1)?, r.get(2)?)),
    )?;

    let status = if ungraded > 0 { "review" } else { "graded" };
    let score = (total > 0).then(|| sum / total as f64);

    tx.execute(
        "UPDATE attempts SET status = ?2, score = ?3, finished_at = COALESCE(finished_at, ?4) WHERE id = ?1",
        params![attempt_id, status, score, now()],
    )?;
    Ok(())
}

/// Stores the final answers and grades multiple-choice and true/false
/// questions. Open answers wait for the learner's self-assessment.
pub fn submit_attempt(db: &Db, attempt_id: &str, responses: Vec<ResponseInput>) -> Result<AttemptDetail> {
    db.with(|conn| {
        let tx = conn.transaction()?;
        let status: String = tx.query_row("SELECT status FROM attempts WHERE id = ?1", [attempt_id], |r| r.get(0))?;
        if status != "in_progress" {
            return Ok(());
        }

        for input in &responses {
            tx.execute(
                "UPDATE attempt_answers SET response = ?3 WHERE attempt_id = ?1 AND question_id = ?2",
                params![attempt_id, input.question_id, input.response],
            )?;
        }

        let answers: Vec<(i64, String, String, Option<String>)> = {
            let mut stmt = tx.prepare(
                "SELECT q.id, q.kind, q.answer, aa.response FROM attempt_answers aa
                 JOIN questions q ON q.id = aa.question_id WHERE aa.attempt_id = ?1",
            )?;
            let rows = stmt.query_map([attempt_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)))?;
            rows.collect::<rusqlite::Result<_>>()?
        };
        for (question_id, kind, answer, response) in answers {
            let score = auto_score(&kind, &answer, response.as_deref());
            tx.execute(
                "UPDATE attempt_answers SET score = ?3 WHERE attempt_id = ?1 AND question_id = ?2",
                params![attempt_id, question_id, score],
            )?;
        }

        refresh_attempt(&tx, attempt_id)?;
        tx.commit()
    })?;

    get_attempt(db, attempt_id)
}

/// The learner grades their own open answer: 0, 0.5 or 1.
pub fn self_grade(db: &Db, attempt_id: &str, question_id: i64, score: f64) -> Result<AttemptDetail> {
    let score = if score >= 0.75 {
        1.0
    } else if score >= 0.25 {
        0.5
    } else {
        0.0
    };

    db.with(|conn| {
        let tx = conn.transaction()?;
        tx.execute(
            "UPDATE attempt_answers SET score = ?3
             WHERE attempt_id = ?1 AND question_id = ?2
               AND (SELECT status FROM attempts WHERE id = ?1) != 'in_progress'
               AND (SELECT kind FROM questions WHERE id = ?2) = 'short_answer'",
            params![attempt_id, question_id, score],
        )?;
        refresh_attempt(&tx, attempt_id)?;
        tx.commit()
    })?;

    get_attempt(db, attempt_id)
}

/// Every test of a book, newest first.
pub fn list_attempts(db: &Db, book_id: &str) -> Result<Vec<AttemptSummary>> {
    db.with(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, status, started_at, finished_at, score, question_count
             FROM attempts WHERE book_id = ?1 ORDER BY started_at DESC",
        )?;
        let rows = stmt.query_map([book_id], |r| {
            Ok(AttemptSummary {
                id: r.get(0)?,
                status: r.get(1)?,
                started_at: r.get(2)?,
                finished_at: r.get(3)?,
                score: r.get(4)?,
                question_count: r.get(5)?,
            })
        })?;
        rows.collect()
    })
}

/// Deletes a test and its answers from the database.
pub fn delete_attempt(db: &Db, attempt_id: &str) -> Result<()> {
    db.with(|conn| conn.execute("DELETE FROM attempts WHERE id = ?1", [attempt_id]))?;
    Ok(())
}
