use tauri::State;
use sqlx::SqlitePool;
use std::sync::Mutex;
use crate::models::{Config, CreateConfig, FileStatus, MergeData, Workspace};
use crate::{db, file_system, sanitizer};

pub struct AppState {
    pub pool: Mutex<Option<SqlitePool>>,
}

// --- Workspace commands ---

#[tauri::command]
pub async fn add_workspace(
    name: String,
    root_path: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let pool = state.pool.lock().unwrap().clone().ok_or("数据库未初始化")?;

    db::add_workspace(&pool, &name, &root_path)
        .await
        .map_err(|e| format!("添加工作区失败: {}", e))
}

#[tauri::command]
pub async fn get_all_workspaces(state: State<'_, AppState>) -> Result<Vec<Workspace>, String> {
    let pool = state.pool.lock().unwrap().clone().ok_or("数据库未初始化")?;

    db::get_all_workspaces(&pool)
        .await
        .map_err(|e| format!("获取工作区失败: {}", e))
}

#[tauri::command]
pub async fn delete_workspace(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let pool = state.pool.lock().unwrap().clone().ok_or("数据库未初始化")?;

    db::delete_workspace(&pool, id)
        .await
        .map_err(|e| format!("删除工作区失败: {}", e))
}

// --- Config commands ---

#[tauri::command]
pub async fn add_config(
    workspace_id: i64,
    name: String,
    relative_path: String,
    workspace_root: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let pool = state.pool.lock().unwrap().clone().ok_or("数据库未初始化")?;

    let content = file_system::read_file(&workspace_root, &relative_path)
        .map_err(|e| format!("读取文件失败: {}", e))?;

    let config = CreateConfig {
        workspace_id,
        name,
        path: relative_path,
        original_content: content,
    };

    db::add_config(&pool, config)
        .await
        .map_err(|e| format!("添加配置失败: {}", e))
}

#[tauri::command]
pub async fn get_all_configs(state: State<'_, AppState>) -> Result<Vec<Config>, String> {
    let pool = state.pool.lock().unwrap().clone().ok_or("数据库未初始化")?;

    db::get_all_configs(&pool)
        .await
        .map_err(|e| format!("获取配置失败: {}", e))
}

#[tauri::command]
pub async fn get_config_by_id(id: i64, state: State<'_, AppState>) -> Result<Option<Config>, String> {
    let pool = state.pool.lock().unwrap().clone().ok_or("数据库未初始化")?;

    db::get_config_by_id(&pool, id)
        .await
        .map_err(|e| format!("获取配置失败: {}", e))
}

#[tauri::command]
pub async fn check_file_status(
    id: i64,
    workspace_root: String,
    state: State<'_, AppState>,
) -> Result<FileStatus, String> {
    let pool = state.pool.lock().unwrap().clone().ok_or("数据库未初始化")?;

    let config = db::get_config_by_id(&pool, id)
        .await
        .map_err(|e| format!("获取配置失败: {}", e))?
        .ok_or("配置不存在")?;

    let disk_hash = file_system::calculate_file_hash(&workspace_root, &config.path)
        .map_err(|e| format!("计算文件哈希失败: {}", e))?;

    let db_hash = file_system::calculate_content_hash(&config.original_content);

    Ok(FileStatus {
        has_external_changes: disk_hash != db_hash,
        current_hash: disk_hash,
    })
}
#[tauri::command]
pub async fn get_config_for_merge(
    id: i64,
    workspace_root: String,
    state: State<'_, AppState>,
) -> Result<MergeData, String> {
    let pool = state.pool.lock().unwrap().clone().ok_or("数据库未初始化")?;

    let config = db::get_config_by_id(&pool, id)
        .await
        .map_err(|e| format!("获取配置失败: {}", e))?
        .ok_or("配置不存在")?;

    let disk_content = file_system::read_file(&workspace_root, &config.path)
        .map_err(|e| format!("读取文件失败: {}", e))?;

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
    let pool = state.pool.lock().unwrap().clone().ok_or("数据库未初始化")?;

    db::update_original_content(&pool, id, &merged_content)
        .await
        .map_err(|e| format!("更新内容失败: {}", e))
}

#[tauri::command]
pub async fn update_original_content(
    id: i64,
    content: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = state.pool.lock().unwrap().clone().ok_or("数据库未初始化")?;

    db::update_original_content(&pool, id, &content)
        .await
        .map_err(|e| format!("更新内容失败: {}", e))
}

#[tauri::command]
pub async fn update_sanitized_content(
    id: i64,
    content: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = state.pool.lock().unwrap().clone().ok_or("数据库未初始化")?;

    db::update_sanitized_content(&pool, id, content.as_deref())
        .await
        .map_err(|e| format!("更新脱敏内容失败: {}", e))
}
#[tauri::command]
pub async fn write_to_file_direct(
    id: i64,
    workspace_root: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = state.pool.lock().unwrap().clone().ok_or("数据库未初始化")?;

    let config = db::get_config_by_id(&pool, id)
        .await
        .map_err(|e| format!("获取配置失败: {}", e))?
        .ok_or("配置不存在")?;

    file_system::write_file(&workspace_root, &config.path, &config.original_content)
        .map_err(|e| format!("写入文件失败: {}", e))
}

#[tauri::command]
pub async fn write_to_file_sanitized(
    id: i64,
    workspace_root: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = state.pool.lock().unwrap().clone().ok_or("数据库未初始化")?;

    let config = db::get_config_by_id(&pool, id)
        .await
        .map_err(|e| format!("获取配置失败: {}", e))?
        .ok_or("配置不存在")?;

    let sanitized_content = if let Some(manual_content) = config.sanitized_content {
        manual_content
    } else {
        sanitizer::sanitize_content(&config.original_content, &config.path)
            .map_err(|e| format!("脱敏失败: {}", e))?
    };

    file_system::write_file(&workspace_root, &config.path, &sanitized_content)
        .map_err(|e| format!("写入文件失败: {}", e))
}

#[tauri::command]
pub async fn delete_config(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let pool = state.pool.lock().unwrap().clone().ok_or("数据库未初始化")?;

    db::delete_config(&pool, id)
        .await
        .map_err(|e| format!("删除配置失败: {}", e))
}

#[tauri::command]
pub async fn get_sanitized_preview(
    id: i64,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let pool = state.pool.lock().unwrap().clone().ok_or("数据库未初始化")?;

    let config = db::get_config_by_id(&pool, id)
        .await
        .map_err(|e| format!("获取配置失败: {}", e))?
        .ok_or("配置不存在")?;

    if let Some(manual_content) = config.sanitized_content {
        return Ok(manual_content);
    }

    sanitizer::sanitize_content(&config.original_content, &config.path)
        .map_err(|e| format!("脱敏失败: {}", e))
}
