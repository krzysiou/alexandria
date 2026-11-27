use serde::Serialize;
use tauri::{AppHandle, State};

use crate::{
    app::{error::CmdResult, state::AppState},
    parsing::pipeline,
    storage::{
        paths,
        settings::{self, Settings},
    },
    system::maintenance::{self, MaintenanceProgress},
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub version: String,
    pub data_dir: String,
    pub database_path: String,
    pub source_dir: String,
    pub can_update: bool,
}

#[tauri::command]
pub async fn app_info(app: AppHandle) -> CmdResult<AppInfo> {
    Ok(AppInfo {
        version: app.package_info().version.to_string(),
        data_dir: paths::data_dir().to_string_lossy().into_owned(),
        database_path: paths::database_path().to_string_lossy().into_owned(),
        source_dir: maintenance::source_dir().to_string_lossy().into_owned(),
        can_update: maintenance::can_update(),
    })
}

/// Starts update, reset or uninstall in the background (see
/// `scripts/maintenance.sh`). Running parse jobs are paused first so their
/// progress is saved.
#[tauri::command]
pub async fn run_maintenance(app: AppHandle, state: State<'_, AppState>, action: String) -> CmdResult<()> {
    let running: Vec<String> = state.jobs.lock().expect("jobs lock").keys().cloned().collect();
    for book_id in running {
        pipeline::pause(&app, &book_id)?;
    }

    maintenance::start(&app, &action).await?;
    Ok(())
}

/// Log and status of the maintenance action started by `run_maintenance`.
#[tauri::command]
pub async fn maintenance_progress(app: AppHandle) -> CmdResult<MaintenanceProgress> {
    Ok(maintenance::progress(&app)?)
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> CmdResult<Settings> {
    Ok(settings::load(&state.db)?)
}

#[tauri::command]
pub async fn save_settings(state: State<'_, AppState>, settings: Settings) -> CmdResult<Settings> {
    let previous = settings::load(&state.db)?;
    let saved = settings::save(&state.db, settings)?;
    if previous.claude_path != saved.claude_path {
        *state.claude.lock().await = None;
    }
    Ok(saved)
}
