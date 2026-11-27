use tauri::{AppHandle, State};

use crate::{
    app::{
        error::CmdResult,
        state::{notify, AppState},
    },
    library::books,
    study::{
        attempts::{self, AttemptDetail, AttemptSummary, ResponseInput, StartOptions},
        exports,
        mastery::{self, QuizStats},
    },
};

#[tauri::command]
pub async fn quiz_stats(state: State<'_, AppState>, book_id: String) -> CmdResult<QuizStats> {
    Ok(mastery::stats(&state.db, &book_id)?)
}

#[tauri::command]
pub async fn start_test(state: State<'_, AppState>, book_id: String, options: StartOptions) -> CmdResult<String> {
    Ok(attempts::start_attempt(&state.db, &book_id, options)?)
}

#[tauri::command]
pub async fn get_test(state: State<'_, AppState>, id: String) -> CmdResult<AttemptDetail> {
    Ok(attempts::get_attempt(&state.db, &id)?)
}

#[tauri::command]
pub async fn list_tests(state: State<'_, AppState>, book_id: String) -> CmdResult<Vec<AttemptSummary>> {
    Ok(attempts::list_attempts(&state.db, &book_id)?)
}

#[tauri::command]
pub async fn save_answer(
    state: State<'_, AppState>,
    id: String,
    question_id: i64,
    response: Option<String>,
) -> CmdResult<()> {
    Ok(attempts::save_response(&state.db, &id, question_id, response)?)
}

fn after_grading(app: &AppHandle, state: &AppState, detail: &AttemptDetail) -> CmdResult<()> {
    let book = books::get_book(&state.db, &detail.book_id)?;
    exports::export_attempt(&book, detail)?;
    notify(app, &book.id);
    Ok(())
}

#[tauri::command]
pub async fn submit_test(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
    responses: Vec<ResponseInput>,
) -> CmdResult<AttemptDetail> {
    let detail = attempts::submit_attempt(&state.db, &id, responses)?;
    after_grading(&app, &state, &detail)?;
    Ok(detail)
}

#[tauri::command]
pub async fn self_grade(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
    question_id: i64,
    score: f64,
) -> CmdResult<AttemptDetail> {
    let detail = attempts::self_grade(&state.db, &id, question_id, score)?;
    after_grading(&app, &state, &detail)?;
    Ok(detail)
}

#[tauri::command]
pub async fn delete_test(app: AppHandle, state: State<'_, AppState>, id: String) -> CmdResult<()> {
    let detail = attempts::get_attempt(&state.db, &id)?;
    let book = books::get_book(&state.db, &detail.book_id)?;
    exports::delete_attempt_with_file(&state.db, &book, &id)?;
    notify(&app, &book.id);
    Ok(())
}
