use std::collections::HashMap;

use anyhow::Result;
use rusqlite::params;
use serde::{Deserialize, Serialize};

use crate::storage::db::Db;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub theme: String,
    pub model: String,
    pub concurrency: u32,
    pub questions_per_section: u32,
    pub book_questions: u32,
    pub claude_path: String,
    pub sidebar_hidden: bool,
    pub palette: String,
    pub font: String,
    pub max_cost_usd: f64,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: "system".into(),
            model: "sonnet".into(),
            concurrency: 2,
            questions_per_section: 8,
            book_questions: 10,
            claude_path: String::new(),
            sidebar_hidden: false,
            palette: "alexandria".into(),
            font: "default".into(),
            max_cost_usd: 5.0,
        }
    }
}

impl Settings {
    fn sanitize(mut self) -> Self {
        if !["system", "light", "dark"].contains(&self.theme.as_str()) {
            self.theme = "system".into();
        }
        if self.model.trim().is_empty() {
            self.model = "sonnet".into();
        }
        self.concurrency = self.concurrency.clamp(1, 6);
        self.questions_per_section = self.questions_per_section.clamp(3, 20);
        self.book_questions = self.book_questions.clamp(0, 30);
        self.claude_path = self.claude_path.trim().to_string();
        self.palette = choice(&self.palette, "alexandria");
        self.font = choice(&self.font, "default");
        self.max_cost_usd = if self.max_cost_usd.is_finite() { self.max_cost_usd.clamp(0.5, 100.0) } else { 5.0 };
        self
    }
}

/// A short identifier chosen in the UI, or `fallback` when it is empty or odd.
fn choice(value: &str, fallback: &str) -> String {
    let value = value.trim();
    let valid = !value.is_empty() && value.len() <= 40 && value.chars().all(|c| c.is_ascii_alphanumeric() || c == '-');
    if valid {
        value.to_string()
    } else {
        fallback.to_string()
    }
}

pub fn load(db: &Db) -> Result<Settings> {
    let stored: HashMap<String, String> = db.with(|conn| {
        let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
        let rows = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?;
        rows.collect()
    })?;
    let mut value = serde_json::to_value(Settings::default())?;
    if let Some(map) = value.as_object_mut() {
        for (key, raw) in stored {
            if let Ok(parsed) = serde_json::from_str(&raw) {
                map.insert(key, parsed);
            }
        }
    }
    Ok(serde_json::from_value::<Settings>(value).unwrap_or_default().sanitize())
}

pub fn save(db: &Db, settings: Settings) -> Result<Settings> {
    let settings = settings.sanitize();
    let value = serde_json::to_value(&settings)?;
    db.with(|conn| {
        let tx = conn.transaction()?;
        if let Some(map) = value.as_object() {
            for (key, val) in map {
                tx.execute(
                    "INSERT INTO settings (key, value) VALUES (?1, ?2)
                     ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                    params![key, val.to_string()],
                )?;
            }
        }
        tx.commit()
    })?;
    Ok(settings)
}
