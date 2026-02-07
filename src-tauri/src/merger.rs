// Simple merger module for handling content conflicts
// The actual merge UI will be handled by the frontend using Monaco Editor's diff view

pub fn detect_conflict(db_content: &str, disk_content: &str) -> bool {
    db_content != disk_content
}

pub fn generate_conflict_markers(db_content: &str, disk_content: &str) -> String {
    format!(
        "<<<<<<< Database Version\n{}\n=======\n{}\n>>>>>>> Disk Version\n",
        db_content, disk_content
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_conflict() {
        assert!(detect_conflict("content1", "content2"));
        assert!(!detect_conflict("same", "same"));
    }

    #[test]
    fn test_generate_conflict_markers() {
        let result = generate_conflict_markers("db content", "disk content");
        assert!(result.contains("<<<<<<< Database Version"));
        assert!(result.contains("======="));
        assert!(result.contains(">>>>>>> Disk Version"));
    }
}
