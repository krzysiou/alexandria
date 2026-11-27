use std::{
    path::Path,
    sync::{Arc, Mutex},
};

use anyhow::{anyhow, Context, Result};
use rusqlite::Connection;

const MIGRATIONS: &[&str] = &[
    r#"
CREATE TABLE books (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    author      TEXT,
    dir_name    TEXT NOT NULL UNIQUE,
    file_name   TEXT NOT NULL,
    page_count  INTEGER NOT NULL DEFAULT 0,
    status      TEXT NOT NULL,
    stage       TEXT,
    error       TEXT,
    summary     TEXT,
    cost_usd    REAL NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE sections (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id       TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    idx           INTEGER NOT NULL,
    title         TEXT NOT NULL,
    placeholder   INTEGER NOT NULL DEFAULT 0,
    start_page    INTEGER NOT NULL,
    end_page      INTEGER NOT NULL,
    word_count    INTEGER NOT NULL,
    mode          TEXT NOT NULL DEFAULT 'text',
    status        TEXT NOT NULL DEFAULT 'pending',
    error         TEXT,
    summary       TEXT,
    file_stem     TEXT,
    UNIQUE (book_id, idx)
);

CREATE TABLE questions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id      TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    section_id   INTEGER REFERENCES sections(id) ON DELETE CASCADE,
    kind         TEXT NOT NULL,
    difficulty   TEXT NOT NULL,
    prompt       TEXT NOT NULL,
    options      TEXT NOT NULL DEFAULT '[]',
    answer       TEXT NOT NULL,
    explanation  TEXT NOT NULL DEFAULT '',
    created_at   TEXT NOT NULL
);
CREATE INDEX questions_book ON questions(book_id, section_id);

CREATE TABLE attempts (
    id              TEXT PRIMARY KEY,
    book_id         TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    status          TEXT NOT NULL,
    scope           TEXT NOT NULL,
    question_count  INTEGER NOT NULL,
    score           REAL,
    started_at      TEXT NOT NULL,
    finished_at     TEXT
);
CREATE INDEX attempts_book ON attempts(book_id, started_at);

CREATE TABLE attempt_answers (
    attempt_id   TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    question_id  INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    position     INTEGER NOT NULL,
    response     TEXT,
    score        REAL,
    feedback     TEXT,
    PRIMARY KEY (attempt_id, question_id)
);
CREATE INDEX attempt_answers_question ON attempt_answers(question_id);

CREATE TABLE settings (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
);
"#,
    r#"
ALTER TABLE books ADD COLUMN limit_used REAL NOT NULL DEFAULT 0;
ALTER TABLE books ADD COLUMN limit_seen REAL;
ALTER TABLE books ADD COLUMN limit_resets_at INTEGER;

CREATE TABLE claude_usage (
    id                   INTEGER PRIMARY KEY CHECK (id = 1),
    five_hour            REAL NOT NULL,
    five_hour_resets_at  INTEGER NOT NULL,
    seven_day            REAL,
    seven_day_resets_at  INTEGER,
    updated_at           TEXT NOT NULL
);
"#,
];

#[derive(Clone)]
pub struct Db(Arc<Mutex<Connection>>);

impl Db {
    pub fn open(path: &Path) -> Result<Self> {
        let mut conn = Connection::open(path).with_context(|| format!("opening database {}", path.display()))?;
        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;")?;
        migrate(&mut conn)?;
        Ok(Self(Arc::new(Mutex::new(conn))))
    }

    /// Run a closure with exclusive access to the connection. Keep closures
    /// short and never hold the lock across an `.await`.
    pub fn with<T>(&self, f: impl FnOnce(&mut Connection) -> rusqlite::Result<T>) -> Result<T> {
        let mut conn = self.0.lock().map_err(|_| anyhow!("database lock poisoned"))?;
        Ok(f(&mut conn)?)
    }
}

fn migrate(conn: &mut Connection) -> Result<()> {
    let version: i64 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;
    for (index, sql) in MIGRATIONS.iter().enumerate().skip(version.max(0) as usize) {
        let tx = conn.transaction()?;
        tx.execute_batch(sql).with_context(|| format!("running migration {}", index + 1))?;
        tx.pragma_update(None, "user_version", (index + 1) as i64)?;
        tx.commit()?;
    }
    Ok(())
}

pub fn now() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

/// In-memory database with the full schema, used by the test suite.
pub fn open_in_memory() -> Db {
    let mut conn = Connection::open_in_memory().unwrap();
    conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
    migrate(&mut conn).unwrap();
    Db(Arc::new(Mutex::new(conn)))
}
