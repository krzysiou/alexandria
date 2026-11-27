use std::path::PathBuf;

use serde::Serialize;
use tauri::{AppHandle, State};

use crate::{
    app::{
        error::{CmdError, CmdResult},
        state::{notify, AppState},
    },
    library::{
        books::{self, Book, Section},
        documents::{self, DocumentInfo},
        import::{self, ImportPayload},
        search::{self, SearchHit},
    },
    parsing::pipeline,
    storage::{paths, settings},
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BookDetail {
    pub book: Book,
    pub sections: Vec<Section>,
    pub cost_cap_usd: f64,
}

#[tauri::command]
pub async fn list_books(state: State<'_, AppState>) -> CmdResult<Vec<Book>> {
    Ok(books::list_books(&state.db)?)
}

#[tauri::command]
pub async fn get_book(state: State<'_, AppState>, id: String) -> CmdResult<BookDetail> {
    Ok(BookDetail {
        book: books::get_book(&state.db, &id)?,
        sections: books::get_sections(&state.db, &id)?,
        cost_cap_usd: settings::load(&state.db)?.max_cost_usd,
    })
}

/// Import step 1: copy the PDF into the library. The frontend then extracts
/// the text with pdf.js and calls `import_book_finish`.
#[tauri::command]
pub async fn import_book_start(app: AppHandle, state: State<'_, AppState>, path: String) -> CmdResult<Book> {
    let book = import::create_book(&state.db, &PathBuf::from(path))?;
    notify(&app, &book.id);
    Ok(book)
}

/// Import step 2: store extracted text, plan sections and start parsing.
#[tauri::command]
pub async fn import_book_finish(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
    payload: ImportPayload,
) -> CmdResult<Book> {
    let book = import::finish_import(&state.db, &id, payload)?;
    pipeline::start(&app, &id)?;
    Ok(book)
}

#[tauri::command]
pub async fn pause_book(app: AppHandle, id: String) -> CmdResult<()> {
    pipeline::pause(&app, &id)?;
    Ok(())
}

#[tauri::command]
pub async fn resume_book(app: AppHandle, state: State<'_, AppState>, id: String) -> CmdResult<()> {
    let book = books::get_book(&state.db, &id)?;
    if book.status == "importing" || book.sections_total == 0 {
        return Err(CmdError::msg("This book was not imported completely. Remove it and add it again."));
    }
    pipeline::start(&app, &id)?;
    Ok(())
}

#[tauri::command]
pub async fn delete_book(app: AppHandle, state: State<'_, AppState>, id: String) -> CmdResult<()> {
    if let Some(job) = state.jobs.lock().expect("jobs lock").remove(&id) {
        job.abort();
    }
    books::delete_book(&state.db, &id)?;
    notify(&app, &id);
    Ok(())
}

#[tauri::command]
pub async fn list_documents(state: State<'_, AppState>, id: String, kind: String) -> CmdResult<Vec<DocumentInfo>> {
    let book = books::get_book(&state.db, &id)?;
    Ok(documents::list_documents(&book, &kind)?)
}

#[tauri::command]
pub async fn read_document(state: State<'_, AppState>, id: String, kind: String, file: String) -> CmdResult<String> {
    let book = books::get_book(&state.db, &id)?;
    Ok(documents::read_document(&book, &kind, &file)?)
}

/// Reveal a book folder (or the whole data folder) in Finder.
#[tauri::command]
pub async fn reveal_in_finder(state: State<'_, AppState>, id: Option<String>) -> CmdResult<()> {
    let dir = match id {
        Some(id) => PathBuf::from(books::get_book(&state.db, &id)?.dir),
        None => paths::data_dir(),
    };
    std::process::Command::new("/usr/bin/open").arg(dir).status()?;
    Ok(())
}

/// Save a copy of a book's original PDF to `destination` (picked in a save dialog).
#[tauri::command]
pub async fn save_book_pdf(state: State<'_, AppState>, id: String, destination: String) -> CmdResult<String> {
    let book = books::get_book(&state.db, &id)?;
    let saved = books::export_pdf(&PathBuf::from(book.dir), &PathBuf::from(destination))?;
    Ok(saved.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn open_external(url: String) -> CmdResult<()> {
    if !url.starts_with("https://") {
        return Err(CmdError::msg("Only https links can be opened"));
    }
    std::process::Command::new("/usr/bin/open").arg(url).status()?;
    Ok(())
}

/// Full-text search over every book's notes and key data.
#[tauri::command]
pub async fn search_library(state: State<'_, AppState>, query: String) -> CmdResult<Vec<SearchHit>> {
    Ok(search::search(&state.db, &query)?)
}
