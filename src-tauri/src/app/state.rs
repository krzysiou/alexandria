use std::{collections::HashMap, sync::Mutex};

use anyhow::Result;
use tauri::{AppHandle, Emitter};

use crate::{
    claude::cli::{self, ClaudeEnv},
    storage::{db::Db, settings::Settings},
    system::maintenance::MaintenanceRun,
};

pub const LIBRARY_CHANGED: &str = "library-changed";

pub struct AppState {
    pub db: Db,
    pub jobs: Mutex<HashMap<String, tauri::async_runtime::JoinHandle<()>>>,
    pub claude: tokio::sync::Mutex<Option<ClaudeEnv>>,
    pub maintenance: Mutex<Option<MaintenanceRun>>,
}

impl AppState {
    pub fn new(db: Db) -> Self {
        Self {
            db,
            jobs: Mutex::new(HashMap::new()),
            claude: tokio::sync::Mutex::new(None),
            maintenance: Mutex::new(None),
        }
    }

    pub async fn claude_env(&self, settings: &Settings) -> Result<ClaudeEnv> {
        let mut cached = self.claude.lock().await;
        if let Some(env) = cached.as_ref() {
            return Ok(env.clone());
        }
        let env = cli::resolve(&settings.claude_path).await?;
        *cached = Some(env.clone());
        Ok(env)
    }
}

pub fn notify(app: &AppHandle, book_id: &str) {
    let _ = app.emit(LIBRARY_CHANGED, book_id);
}
