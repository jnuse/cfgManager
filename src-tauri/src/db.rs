use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use std::path::Path;
use std::str::FromStr;
use crate::models::{Config, CreateConfig, Workspace};

pub async fn init_db(app_data_dir: &Path) -> Result<SqlitePool, sqlx::Error> {
    let db_path = app_data_dir.join("config_guardian.db");

    let options = SqliteConnectOptions::from_str(&format!("sqlite:{}", db_path.display()))?
        .create_if_missing(true);

    let pool = SqlitePool::connect_with(options).await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS workspaces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            root_path TEXT NOT NULL UNIQUE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            original_content TEXT NOT NULL,
            sanitized_content TEXT,
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}

// --- Workspace CRUD ---

pub async fn add_workspace(pool: &SqlitePool, name: &str, root_path: &str) -> Result<i64, sqlx::Error> {
    let result = sqlx::query(
        "INSERT INTO workspaces (name, root_path) VALUES (?, ?)",
    )
    .bind(name)
    .bind(root_path)
    .execute(pool)
    .await?;

    Ok(result.last_insert_rowid())
}

pub async fn get_all_workspaces(pool: &SqlitePool) -> Result<Vec<Workspace>, sqlx::Error> {
    sqlx::query_as::<_, Workspace>("SELECT id, name, root_path FROM workspaces ORDER BY id")
        .fetch_all(pool)
        .await
}

pub async fn delete_workspace(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM configs WHERE workspace_id = ?").bind(id).execute(pool).await?;
    sqlx::query("DELETE FROM workspaces WHERE id = ?").bind(id).execute(pool).await?;
    Ok(())
}

// --- Config CRUD ---

pub async fn add_config(pool: &SqlitePool, config: CreateConfig) -> Result<i64, sqlx::Error> {
    let result = sqlx::query(
        "INSERT INTO configs (workspace_id, name, path, original_content, sanitized_content) VALUES (?, ?, ?, ?, NULL)",
    )
    .bind(config.workspace_id)
    .bind(&config.name)
    .bind(&config.path)
    .bind(&config.original_content)
    .execute(pool)
    .await?;

    Ok(result.last_insert_rowid())
}

pub async fn get_configs_by_workspace(pool: &SqlitePool, workspace_id: i64) -> Result<Vec<Config>, sqlx::Error> {
    sqlx::query_as::<_, Config>(
        "SELECT id, workspace_id, name, path, original_content, sanitized_content FROM configs WHERE workspace_id = ? ORDER BY path",
    )
    .bind(workspace_id)
    .fetch_all(pool)
    .await
}

pub async fn get_all_configs(pool: &SqlitePool) -> Result<Vec<Config>, sqlx::Error> {
    sqlx::query_as::<_, Config>(
        "SELECT id, workspace_id, name, path, original_content, sanitized_content FROM configs ORDER BY workspace_id, path",
    )
    .fetch_all(pool)
    .await
}
pub async fn get_config_by_id(pool: &SqlitePool, id: i64) -> Result<Option<Config>, sqlx::Error> {
    sqlx::query_as::<_, Config>(
        "SELECT id, workspace_id, name, path, original_content, sanitized_content FROM configs WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn update_original_content(pool: &SqlitePool, id: i64, content: &str) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE configs SET original_content = ? WHERE id = ?")
        .bind(content)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn update_sanitized_content(pool: &SqlitePool, id: i64, content: Option<&str>) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE configs SET sanitized_content = ? WHERE id = ?")
        .bind(content)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn delete_config(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM configs WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}
