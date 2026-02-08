use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Workspace {
    pub id: i64,
    pub name: String,
    pub root_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Config {
    pub id: i64,
    pub workspace_id: i64,
    pub name: String,
    pub path: String,
    pub original_content: String,
    pub sanitized_content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateConfig {
    pub workspace_id: i64,
    pub name: String,
    pub path: String,
    pub original_content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileStatus {
    pub has_external_changes: bool,
    pub current_hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MergeData {
    pub db_content: String,
    pub disk_content: String,
}
