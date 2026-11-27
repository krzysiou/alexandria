use tauri::State;

use crate::{
    app::{error::CmdResult, state::AppState},
    claude::cli::{self, ClaudeStatus},
    storage::{
        settings,
        usage::{self, UsageSnapshot},
    },
};

#[tauri::command]
pub async fn claude_status(state: State<'_, AppState>) -> CmdResult<ClaudeStatus> {
    let settings = settings::load(&state.db)?;
    let (env, status) = cli::status(&settings.claude_path).await;
    *state.claude.lock().await = env;
    Ok(status)
}

#[tauri::command]
pub async fn claude_login(state: State<'_, AppState>) -> CmdResult<()> {
    let settings = settings::load(&state.db)?;
    let env = state.claude_env(&settings).await?;
    cli::open_login(&env)?;
    Ok(())
}

#[tauri::command]
pub async fn claude_install() -> CmdResult<()> {
    cli::open_install()?;
    Ok(())
}

/// Latest 5-hour and weekly usage of the Claude plan, as reported by the last
/// Claude call. None for accounts without plan limits or before the first call.
#[tauri::command]
pub async fn claude_usage(state: State<'_, AppState>) -> CmdResult<Option<UsageSnapshot>> {
    Ok(usage::latest(&state.db)?)
}
