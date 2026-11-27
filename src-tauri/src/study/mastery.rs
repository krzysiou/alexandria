use std::collections::HashMap;

use anyhow::Result;
use rusqlite::{Connection, OptionalExtension};
use serde::Serialize;

use crate::storage::db::Db;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SectionMastery {
    pub section_id: Option<i64>,
    pub title: String,
    pub question_count: i64,
    pub answered: i64,
    pub mastery: Option<f64>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QuizStats {
    pub total: i64,
    pub by_kind: HashMap<String, i64>,
    pub attempts: i64,
    pub best_score: Option<f64>,
    pub average_score: Option<f64>,
    pub last_score: Option<f64>,
    pub sections: Vec<SectionMastery>,
}

/// Number of questions in the bank per question kind.
fn questions_by_kind(conn: &Connection, book_id: &str) -> rusqlite::Result<HashMap<String, i64>> {
    let mut stmt = conn.prepare("SELECT kind, COUNT(*) FROM questions WHERE book_id = ?1 GROUP BY kind")?;
    let rows = stmt.query_map([book_id], |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)))?;
    rows.collect()
}

/// Average score per section over every answer ever given (whole-book
/// questions are grouped last as "Whole book").
fn section_mastery(conn: &Connection, book_id: &str) -> rusqlite::Result<Vec<SectionMastery>> {
    let mut stmt = conn.prepare(
        "SELECT s.id, COALESCE(s.title, 'Whole book'), COUNT(DISTINCT q.id),
                COUNT(DISTINCT CASE WHEN aa.score IS NOT NULL THEN q.id END), AVG(aa.score)
         FROM questions q
         LEFT JOIN sections s ON s.id = q.section_id
         LEFT JOIN attempt_answers aa ON aa.question_id = q.id
         WHERE q.book_id = ?1
         GROUP BY q.section_id
         ORDER BY s.idx IS NULL, s.idx",
    )?;
    let rows = stmt.query_map([book_id], |r| {
        Ok(SectionMastery {
            section_id: r.get(0)?,
            title: r.get(1)?,
            question_count: r.get(2)?,
            answered: r.get(3)?,
            mastery: r.get(4)?,
        })
    })?;
    rows.collect()
}

/// Question bank size, test scores and mastery per section for a book.
pub fn stats(db: &Db, book_id: &str) -> Result<QuizStats> {
    db.with(|conn| {
        let by_kind = questions_by_kind(conn, book_id)?;
        let total = by_kind.values().sum();

        let (attempts, best_score, average_score): (i64, Option<f64>, Option<f64>) = conn.query_row(
            "SELECT COUNT(*), MAX(score), AVG(score) FROM attempts WHERE book_id = ?1 AND status = 'graded'",
            [book_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )?;
        let last_score: Option<f64> = conn
            .query_row(
                "SELECT score FROM attempts WHERE book_id = ?1 AND status = 'graded' ORDER BY started_at DESC LIMIT 1",
                [book_id],
                |r| r.get(0),
            )
            .optional()?
            .flatten();

        let sections = section_mastery(conn, book_id)?;
        Ok(QuizStats { total, by_kind, attempts, best_score, average_score, last_score, sections })
    })
}
