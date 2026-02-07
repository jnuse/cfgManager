use std::path::{Path, PathBuf};
use std::fs;
use sha2::{Sha256, Digest};

#[derive(Debug)]
pub enum FileSystemError {
    IoError(std::io::Error),
    InvalidPath(String),
}

impl From<std::io::Error> for FileSystemError {
    fn from(err: std::io::Error) -> Self {
        FileSystemError::IoError(err)
    }
}

impl std::fmt::Display for FileSystemError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FileSystemError::IoError(e) => write!(f, "IO Error: {}", e),
            FileSystemError::InvalidPath(msg) => write!(f, "Invalid Path: {}", msg),
        }
    }
}

impl std::error::Error for FileSystemError {}

pub fn resolve_path(workspace_root: &str, relative_path: &str) -> Result<PathBuf, FileSystemError> {
    let workspace = Path::new(workspace_root);
    let full_path = workspace.join(relative_path);

    // Security check: ensure the resolved path is within workspace
    let canonical_workspace = workspace.canonicalize()
        .map_err(|_| FileSystemError::InvalidPath("Invalid workspace path".to_string()))?;

    let canonical_full = full_path.canonicalize()
        .or_else(|_| {
            // If file doesn't exist yet, check parent directory
            if let Some(parent) = full_path.parent() {
                parent.canonicalize().map(|p| p.join(full_path.file_name().unwrap()))
            } else {
                Err(std::io::Error::new(std::io::ErrorKind::NotFound, "Invalid path"))
            }
        })
        .map_err(|_| FileSystemError::InvalidPath("Cannot resolve path".to_string()))?;

    if !canonical_full.starts_with(&canonical_workspace) {
        return Err(FileSystemError::InvalidPath(
            "Path is outside workspace".to_string()
        ));
    }

    Ok(full_path)
}

pub fn read_file(workspace_root: &str, relative_path: &str) -> Result<String, FileSystemError> {
    let full_path = resolve_path(workspace_root, relative_path)?;
    let content = fs::read_to_string(full_path)?;
    Ok(content)
}

pub fn write_file(
    workspace_root: &str,
    relative_path: &str,
    content: &str,
) -> Result<(), FileSystemError> {
    let full_path = resolve_path(workspace_root, relative_path)?;

    // Create parent directories if they don't exist
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)?;
    }

    fs::write(full_path, content)?;
    Ok(())
}

pub fn calculate_file_hash(workspace_root: &str, relative_path: &str) -> Result<String, FileSystemError> {
    let content = read_file(workspace_root, relative_path)?;
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    let result = hasher.finalize();
    Ok(hex::encode(result))
}

pub fn calculate_content_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

pub fn file_exists(workspace_root: &str, relative_path: &str) -> bool {
    if let Ok(full_path) = resolve_path(workspace_root, relative_path) {
        full_path.exists()
    } else {
        false
    }
}
