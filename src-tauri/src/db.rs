use sqlx::{sqlite::SqlitePool, Row};
use crate::models::{Config, CreateConfig};

pub async fn init_db(workspace_root: &str) -> Result<SqlitePool, sqlx::Error> {
    let db_path = format!("{}/config_guardian.db", workspace_root);
    let db_url = format!("sqlite:{}", db_path);

    let pool = SqlitePool::connect(&db_url).await?;

    // Create configs table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            original_content TEXT NOT NULL,
            sanitized_content TEXT
        )
        "#
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}

pub async fn add_config(
    pool: &SqlitePool,
    config: CreateConfig,
) -> Result<i64, sqlx::Error> {
    let result = sqlx::query(
        r#"
        INSERT INTO configs (name, path, original_content, sanitized_content)
        VALUES (?, ?, ?, NULL)
        "#
    )
    .bind(&config.name)
    .bind(&config.path)
    .bind(&config.original_content)
    .execute(pool)
    .await?;

    Ok(result.last_insert_rowid())
}

pub async fn get_all_configs(pool: &SqlitePool) -> Result<Vec<Config>, sqlx::Error> {
    let configs = sqlx::query_as::<_, Config>(
        r#"
        SELECT id, name, path, original_content, sanitized_content
        FROM configs
        ORDER BY id DESC
        "#
    )
    .fetch_all(pool)
    .await?;

    Ok(configs)
}

pub async fn get_config_by_id(pool: &SqlitePool, id: i64) -> Result<Option<Config>, sqlx::Error> {
    let config = sqlx::query_as::<_, Config>(
        r#"
        SELECT id, name, path, original_content, sanitized_content
        FROM configs
        WHERE id = ?
        "#
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(config)
}

pub async fn update_original_content(
    pool: &SqlitePool,
    id: i64,
    content: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE configs
        SET original_content = ?
        WHERE id = ?
        "#
    )
    .bind(content)
    .bind(id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn update_sanitized_content(
    pool: &SqlitePool,
    id: i64,
    content: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE configs
        SET sanitized_content = ?
        WHERE id = ?
        "#
    )
    .bind(content)
    .bind(id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn delete_config(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        DELETE FROM configs
        WHERE id = ?
        "#
    )
    .bind(id)
    .execute(pool)
    .await?;

    Ok(())
}
