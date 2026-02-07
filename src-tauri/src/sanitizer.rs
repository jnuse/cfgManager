use serde_json::Value as JsonValue;
use serde_yaml::Value as YamlValue;
use std::collections::BTreeMap;

#[derive(Debug)]
pub enum SanitizerError {
    UnsupportedFormat(String),
    ParseError(String),
}

impl std::fmt::Display for SanitizerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SanitizerError::UnsupportedFormat(msg) => write!(f, "Unsupported format: {}", msg),
            SanitizerError::ParseError(msg) => write!(f, "Parse error: {}", msg),
        }
    }
}

impl std::error::Error for SanitizerError {}

pub fn sanitize_content(content: &str, file_path: &str) -> Result<String, SanitizerError> {
    let extension = std::path::Path::new(file_path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");

    match extension {
        "json" => sanitize_json(content),
        "yaml" | "yml" => sanitize_yaml(content),
        "toml" => sanitize_toml(content),
        "env" => sanitize_env(content),
        _ => Err(SanitizerError::UnsupportedFormat(format!(
            "File extension '{}' is not supported for automatic sanitization",
            extension
        ))),
    }
}

fn sanitize_json(content: &str) -> Result<String, SanitizerError> {
    let value: JsonValue = serde_json::from_str(content)
        .map_err(|e| SanitizerError::ParseError(format!("Invalid JSON: {}", e)))?;

    let sanitized = sanitize_json_value(&value);

    serde_json::to_string_pretty(&sanitized)
        .map_err(|e| SanitizerError::ParseError(format!("Failed to serialize JSON: {}", e)))
}

fn sanitize_json_value(value: &JsonValue) -> JsonValue {
    match value {
        JsonValue::Object(map) => {
            let mut sanitized_map = serde_json::Map::new();
            for (key, val) in map {
                sanitized_map.insert(key.clone(), sanitize_json_value(val));
            }
            JsonValue::Object(sanitized_map)
        }
        JsonValue::Array(arr) => {
            JsonValue::Array(arr.iter().map(sanitize_json_value).collect())
        }
        JsonValue::String(_) => JsonValue::String("***".to_string()),
        JsonValue::Number(_) => JsonValue::Number(serde_json::Number::from(0)),
        JsonValue::Bool(_) => JsonValue::Bool(false),
        JsonValue::Null => JsonValue::Null,
    }
}

fn sanitize_yaml(content: &str) -> Result<String, SanitizerError> {
    let value: YamlValue = serde_yaml::from_str(content)
        .map_err(|e| SanitizerError::ParseError(format!("Invalid YAML: {}", e)))?;

    let sanitized = sanitize_yaml_value(&value);

    serde_yaml::to_string(&sanitized)
        .map_err(|e| SanitizerError::ParseError(format!("Failed to serialize YAML: {}", e)))
}

fn sanitize_yaml_value(value: &YamlValue) -> YamlValue {
    match value {
        YamlValue::Mapping(map) => {
            let mut sanitized_map = serde_yaml::Mapping::new();
            for (key, val) in map {
                sanitized_map.insert(key.clone(), sanitize_yaml_value(val));
            }
            YamlValue::Mapping(sanitized_map)
        }
        YamlValue::Sequence(seq) => {
            YamlValue::Sequence(seq.iter().map(sanitize_yaml_value).collect())
        }
        YamlValue::String(_) => YamlValue::String("***".to_string()),
        YamlValue::Number(_) => YamlValue::Number(serde_yaml::Number::from(0)),
        YamlValue::Bool(_) => YamlValue::Bool(false),
        YamlValue::Null => YamlValue::Null,
        YamlValue::Tagged(tagged) => {
            YamlValue::Tagged(Box::new(serde_yaml::value::TaggedValue {
                tag: tagged.tag.clone(),
                value: sanitize_yaml_value(&tagged.value),
            }))
        }
    }
}

fn sanitize_toml(content: &str) -> Result<String, SanitizerError> {
    let value: toml::Value = toml::from_str(content)
        .map_err(|e| SanitizerError::ParseError(format!("Invalid TOML: {}", e)))?;

    let sanitized = sanitize_toml_value(&value);

    toml::to_string_pretty(&sanitized)
        .map_err(|e| SanitizerError::ParseError(format!("Failed to serialize TOML: {}", e)))
}

fn sanitize_toml_value(value: &toml::Value) -> toml::Value {
    match value {
        toml::Value::Table(map) => {
            let mut sanitized_map = BTreeMap::new();
            for (key, val) in map {
                sanitized_map.insert(key.clone(), sanitize_toml_value(val));
            }
            toml::Value::Table(sanitized_map)
        }
        toml::Value::Array(arr) => {
            toml::Value::Array(arr.iter().map(sanitize_toml_value).collect())
        }
        toml::Value::String(_) => toml::Value::String("***".to_string()),
        toml::Value::Integer(_) => toml::Value::Integer(0),
        toml::Value::Float(_) => toml::Value::Float(0.0),
        toml::Value::Boolean(_) => toml::Value::Boolean(false),
        toml::Value::Datetime(dt) => toml::Value::Datetime(dt.clone()),
    }
}

fn sanitize_env(content: &str) -> Result<String, SanitizerError> {
    let mut sanitized_lines = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();

        // Preserve comments and empty lines
        if trimmed.is_empty() || trimmed.starts_with('#') {
            sanitized_lines.push(line.to_string());
            continue;
        }

        // Parse key=value pairs
        if let Some(pos) = trimmed.find('=') {
            let key = &trimmed[..pos];
            sanitized_lines.push(format!("{}=***", key));
        } else {
            // Invalid line, preserve as-is
            sanitized_lines.push(line.to_string());
        }
    }

    Ok(sanitized_lines.join("\n"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_json() {
        let input = r#"{"name": "test", "age": 30, "active": true, "data": null}"#;
        let result = sanitize_json(input).unwrap();
        assert!(result.contains(r#""name": "***""#));
        assert!(result.contains(r#""age": 0"#));
        assert!(result.contains(r#""active": false"#));
    }

    #[test]
    fn test_sanitize_env() {
        let input = "API_KEY=secret123\n# Comment\nDB_PASSWORD=pass456";
        let result = sanitize_env(input).unwrap();
        assert!(result.contains("API_KEY=***"));
        assert!(result.contains("# Comment"));
        assert!(result.contains("DB_PASSWORD=***"));
    }
}
