use anyhow::Result;
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;

use crate::storage::db::{now, Db};

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UsageLimits {
    pub five_hour: f64,
    pub five_hour_resets_at: i64,
    pub seven_day: Option<f64>,
    pub seven_day_resets_at: Option<i64>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UsageSnapshot {
    #[serde(flatten)]
    pub limits: UsageLimits,
    pub updated_at: String,
}

/// The most recent usage limits reported by Claude Code, if any.
pub fn latest(db: &Db) -> Result<Option<UsageSnapshot>> {
    db.with(|conn| {
        conn.query_row(
            "SELECT five_hour, five_hour_resets_at, seven_day, seven_day_resets_at, updated_at
             FROM claude_usage WHERE id = 1",
            [],
            |r| {
                Ok(UsageSnapshot {
                    limits: UsageLimits {
                        five_hour: r.get(0)?,
                        five_hour_resets_at: r.get(1)?,
                        seven_day: r.get(2)?,
                        seven_day_resets_at: r.get(3)?,
                    },
                    updated_at: r.get(4)?,
                })
            },
        )
        .optional()
    })
}

/// Remembers the latest usage limits.
fn save(conn: &Connection, limits: &UsageLimits) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO claude_usage (id, five_hour, five_hour_resets_at, seven_day, seven_day_resets_at, updated_at)
         VALUES (1, ?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(id) DO UPDATE SET five_hour = excluded.five_hour,
             five_hour_resets_at = excluded.five_hour_resets_at, seven_day = excluded.seven_day,
             seven_day_resets_at = excluded.seven_day_resets_at, updated_at = excluded.updated_at",
        params![limits.five_hour, limits.five_hour_resets_at, limits.seven_day, limits.seven_day_resets_at, now()],
    )?;
    Ok(())
}

/// Adds the cost of one Claude call to a book and saves the plan's usage
/// limits when Claude reported them.
pub fn record(conn: &Connection, book_id: &str, cost_usd: f64, limits: Option<&UsageLimits>) -> rusqlite::Result<()> {
    conn.execute("UPDATE books SET cost_usd = cost_usd + ?2 WHERE id = ?1", params![book_id, cost_usd])?;

    if let Some(limits) = limits {
        save(conn, limits)?;
    }
    Ok(())
}
