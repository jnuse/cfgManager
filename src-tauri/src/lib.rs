mod models;
mod db;
mod file_system;
mod sanitizer;
mod merger;
mod commands;

use std::sync::Mutex;
use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState {
        pool: Mutex::new(None),
        workspace_root: Mutex::new(None),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::init_workspace,
            commands::add_config,
            commands::get_all_configs,
            commands::get_config_by_id,
            commands::check_file_status,
            commands::get_config_for_merge,
            commands::resolve_conflict,
            commands::update_original_content,
            commands::update_sanitized_content,
            commands::write_to_file_direct,
            commands::write_to_file_sanitized,
            commands::delete_config,
            commands::get_sanitized_preview,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
