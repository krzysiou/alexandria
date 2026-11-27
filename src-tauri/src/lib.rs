mod app;
mod claude;
mod commands;
pub mod library;
pub mod parsing;
pub mod storage;
pub mod study;
mod system;

use tauri::{Manager, RunEvent};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            storage::paths::ensure_data_dir()?;
            let db = storage::db::Db::open(&storage::paths::database_path())?;
            let interrupted = library::books::recover_interrupted(&db)?;
            app.manage(crate::app::state::AppState::new(db));

            for book_id in interrupted {
                parsing::pipeline::start(app.handle(), &book_id)?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::claude::claude_status,
            commands::claude::claude_login,
            commands::claude::claude_install,
            commands::claude::claude_usage,
            commands::system::app_info,
            commands::system::run_maintenance,
            commands::system::maintenance_progress,
            commands::system::get_settings,
            commands::system::save_settings,
            commands::library::list_books,
            commands::library::get_book,
            commands::library::import_book_start,
            commands::library::import_book_finish,
            commands::library::pause_book,
            commands::library::resume_book,
            commands::library::delete_book,
            commands::library::list_documents,
            commands::library::read_document,
            commands::library::search_library,
            commands::library::reveal_in_finder,
            commands::library::save_book_pdf,
            commands::library::open_external,
            commands::study::quiz_stats,
            commands::study::start_test,
            commands::study::get_test,
            commands::study::list_tests,
            commands::study::save_answer,
            commands::study::submit_test,
            commands::study::self_grade,
            commands::study::delete_test,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Alexandria")
        .run(|_, event| {
            if let RunEvent::Exit = event {
                claude::cli::stop_all();
            }
        });
}
