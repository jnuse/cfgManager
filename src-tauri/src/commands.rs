use tauri::State;
use sqlx::SqlitePool;
use std::sync::Mutex;
use crate::models::{Config, CreateConfig, FileStatus, MergeData};
use crate::{db, file_system, sanitizer};

pub struct AppState {
    pub pool: Mutex<Option<SqlitePool>>,
    pub workspace_root: Mutex<Option<String>>,
}

#[tauri::command]
pub async fn init_workspace(
    workspace_root: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = db::init_db(&workspace_root)
        .await
        .map_err(|e| format!("Failed to initialize database: {}", e))?;

    *state.pool.lock().unwrap() = Some(pool);
    *state.workspace_root.lock().unwrap() = Some(workspace_root);

    Ok(())
}

#[tauri::command]
pub async fn add_config(
    name: String,
    relative_path: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let pool = state.pool.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;

    let workspace_root = state.workspace_root.lock().unwrap();
    let workspace_root = workspace_root.as_ref().ok_or("Workspace not set")?;

    // Read file content
    let content = file_system::read_file(workspace_root, &relative_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let config = CreateConfig {
        name,
        path: relative_path,
        original_content: content,
    };

    let id = db::add_config(pool, config)
        .await
        .map_err(|e| format!("Failed to add config: {}", e))?;

    Ok(id)
}

#[tauri::command]
pub async fn get_all_configs(state: State<'_, AppState>) -> Result<Vec<Config>, String> {
    let pool = state.pool.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;

    let configs = db::get_all_configs(pool)
        .await
        .map_err(|e| format!("Failed to get configs: {}", e))?;

    Ok(configs)
}

#[tauri::command]
pub async fn get_config_by_id(id: i64, state: State<'_, AppState>) -> Result<Option<Config>, String> {
    let pool = state.pool.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;

    let config = db::get_config_by_id(pool, id)
        .await
        .map_err(|e| format!("Failed to get config: {}", e))?;

    Ok(config)
}

#[tauri::command]
pub async fn check_file_status(
    id: i64,
    state: State<'_, AppState>,
) -> Result<FileStatus, String> {
    let pool = state.pool.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;

    let workspace_root = state.workspace_root.lock().unwrap();
    let workspace_root = workspace_root.as_ref().ok_or("Workspace not set")?;

    let config = db::get_config_by_id(pool, id)
        .await
        .map_err(|e| format!("Failed to get config: ", e))?
        .ok_or("Config not found")?;

    // Calculate hash of current file on disk
    let disk_hash = file_system::calculate_file_hash(workspace_root, &config.path)
        .map_err(|e| format!("Failed to calculate file hash: {}", e))?;

    // Calculate hash of content in database
    let db_hash = file_system::calculate_content_hash(&config.original_content);

    Ok(FileStatus {
        has_external_changes: disk_hash != db_hash,
        current_hash: disk_hash,
    })
}

#[tauri::command]
pub async fn get_config_for_merge(
    id: i64,
    state: State<'_, AppState>,
) -> Result<MergeData, String> {
    let pool = state.pool.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;

    let workspace_root = state.workspace_root.lock().unwrap();
    let workspace_root = workspace_root.as_ref().ok_or("Workspace not set")?;

    let config = db::get_config_by_id(pool, id)
        .await
        .map_err(|e| format!("Failed to get config: {}", e))?
        .ok_or("Config not found")?;

    let disk_content = file_system::read_file(workspace_root, &config.path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    Ok(MergeData {
        db_content: config.original_content,
        disk_content,
    })
}

#[tauri::command]
pub async fn resolve_conflict(
    id: i64,
    merged_content: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = state.pool.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;

    db::update_original_content(pool, id, &merged_content)
        .await
        .map_err(|e| format!("Failed to update content: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn update_original_content(
    id: i64,
    content: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = state.pool.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;

    db::update_original_content(pool, id, &content)
        .await
        .map_err(|e| format!("Failed to update content: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn update_sanitized_content(
    id: i64,
    content: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = state.pool.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;

    db::update_sanitized_content(pool, id, content.as_deref())
        .await
        .map_err(|e| format!("Failed to update sanitized content: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn write_to_file_direct(
    id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = state.pool.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;

    let workspace_root = state.workspace_root.lock().unwrap();
    let workspace_root = workspace_root.as_ref().ok_or("Workspace not set")?;

    let config = db::get_config_by_id(pool, id)
        .await
        .map_err(|e| format!("Failed to get config: {}", e))?
        .ok_or("Config not found")?;

    file_system::write_file(workspace_root, &config.path, &config.original_content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn write_to_file_sanitized(
    id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = state.pool.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;

    let workspace_root = state.workspace_root.lock().unwrap();
    let workspace_root = workspace_root.as_ref().ok_or("Workspace not set")?;

    let config = db::get_config_by_id(pool, id)
        .await
        .map_err(|e| format!("Failed to get config: {}", e))?
        .ok_or("Config not found")?;

    // Priority: manual sanitized content > auto sanitization
    let sanitized_content = if let Some(manual_content) = config.sanitized_content {
        manual_content
    } else {
        // Auto sanitize
        sanitizer::sanitize_content(&config.original_content, &config.path)
            .map_err(|e| format!("Failed to sanitize content: {}", e))?
    };

    file_system::write_file(workspace_root, &config.path, &sanitized_content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_config(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let pool = state.pool.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;

    db::delete_config(pool, id)
        .await
        .map_err(|e| format!("Failed to delete config: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_sanitized_preview(
    id: i64,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let pool = state.pool.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;

    let config = db::get_config_by_id(pool, id)
        .await
        .map_err(|e| format!("Failed to get config: {}", e))?
        .ok_or("Config not found")?;

    // If manual sanitized content exists, return it
    if let Some(manual_content) = config.sanitized_content {
        return Ok(manual_content);
    }

    // Otherwise, generate auto-sanitized preview
    let sanitized = sanitizer::sanitize_content(&config.original_content, &config.path)
        .map_err(|e| format!("Failed to sanitize: {}", e))?;

    Ok(sanitized)
}
