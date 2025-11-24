use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use hex;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use worker::*;

#[derive(Serialize, Deserialize)]
pub struct HashRequest {
    pub values: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct HashResponse {
    pub hashes: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ValidationRequest {
    pub translations: Vec<TranslationToValidate>,
    pub source_hashes: std::collections::HashMap<String, String>,
}

#[derive(Serialize, Deserialize)]
pub struct TranslationToValidate {
    pub id: String,
    pub key: String,
    pub source_hash: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ValidationResponse {
    pub results: Vec<ValidationResult>,
}

#[derive(Serialize, Deserialize)]
pub struct ValidationResult {
    pub id: String,
    pub is_valid: bool,
    pub reason: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct SortRequest {
    pub items: Vec<serde_json::Value>,
    pub sort_by: String,
    pub order: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct SortResponse {
    pub sorted: Vec<serde_json::Value>,
}

pub fn hash_value(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    let hex_string = hex::encode(hasher.finalize());
    hex_string[..16].to_string()
}

pub fn batch_hash_values(values: &[String]) -> Vec<String> {
    values.iter().map(|v| hash_value(v)).collect()
}

pub fn batch_validate_translations(
    translations: &[TranslationToValidate],
    source_hashes: &std::collections::HashMap<String, String>,
) -> Vec<ValidationResult> {
    translations
        .iter()
        .map(|t| match source_hashes.get(&t.key) {
            None => ValidationResult {
                id: t.id.clone(),
                is_valid: false,
                reason: Some("Key no longer exists in source".to_string()),
            },
            Some(current) => match &t.source_hash {
                None => ValidationResult {
                    id: t.id.clone(),
                    is_valid: false,
                    reason: Some("Translation missing source tracking".to_string()),
                },
                Some(s) if s != current => ValidationResult {
                    id: t.id.clone(),
                    is_valid: false,
                    reason: Some("Source value changed".to_string()),
                },
                _ => ValidationResult {
                    id: t.id.clone(),
                    is_valid: true,
                    reason: None,
                },
            },
        })
        .collect()
}

pub fn sort_items(items: &mut Vec<serde_json::Value>, sort_by: &str, order: &str) {
    items.sort_by(|a, b| {
        let a_val = &a[sort_by];
        let b_val = &b[sort_by];
        let ord = match (a_val, b_val) {
            (serde_json::Value::String(a), serde_json::Value::String(b)) => a.cmp(b),
            (serde_json::Value::Number(a), serde_json::Value::Number(b)) => a
                .as_f64()
                .partial_cmp(&b.as_f64())
                .unwrap_or(std::cmp::Ordering::Equal),
            (serde_json::Value::Bool(a), serde_json::Value::Bool(b)) => a.cmp(b),
            _ => std::cmp::Ordering::Equal,
        };
        if order == "desc" {
            ord.reverse()
        } else {
            ord
        }
    });
}

#[event(fetch)]
async fn main(mut req: Request, env: Env, ctx: Context) -> Result<Response> {
    let url = req.url()?;
    match (req.method(), url.path()) {
        (Method::Post, "/hash") => {
            let req: HashRequest = req.json().await?;
            Response::from_json(&HashResponse {
                hashes: batch_hash_values(&req.values),
            })
        }
        (Method::Post, "/validate") => {
            let req: ValidationRequest = req.json().await?;
            Response::from_json(&ValidationResponse {
                results: batch_validate_translations(&req.translations, &req.source_hashes),
            })
        }
        (Method::Post, "/sort") => {
            let mut req: SortRequest = req.json().await?;
            let order = req.order.as_deref().unwrap_or("asc");
            sort_items(&mut req.items, &req.sort_by, order);
            Response::from_json(&SortResponse { sorted: req.items })
        }
        (Method::Get, "/health") => Response::from_json(
            &serde_json::json!({"status":"ok","worker":"rust-compute-worker","version":"0.3.0"}),
        ),
        _ => Response::error("Not Found", 404),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_value() {
        let value = "Hello, World!";
        let hash = hash_value(value);
        assert_eq!(hash.len(), 16);
        let hash2 = hash_value(value);
        assert_eq!(hash, hash2);
    }

    #[test]
    fn test_batch_hash_values() {
        let values = vec![
            "value1".to_string(),
            "value2".to_string(),
            "value3".to_string(),
        ];
        let hashes = batch_hash_values(&values);
        assert_eq!(hashes.len(), 3);
        assert!(hashes.iter().all(|h| h.len() == 16));
    }

    #[test]
    fn test_batch_validate_translations() {
        let mut source_hashes = std::collections::HashMap::new();
        source_hashes.insert("key1".to_string(), "hash1".to_string());
        source_hashes.insert("key2".to_string(), "hash2".to_string());

        let translations = vec![
            TranslationToValidate {
                id: "t1".to_string(),
                key: "key1".to_string(),
                source_hash: Some("hash1".to_string()),
            },
            TranslationToValidate {
                id: "t2".to_string(),
                key: "key2".to_string(),
                source_hash: Some("hash_old".to_string()),
            },
            TranslationToValidate {
                id: "t3".to_string(),
                key: "key3".to_string(),
                source_hash: Some("hash3".to_string()),
            },
        ];

        let results = batch_validate_translations(&translations, &source_hashes);
        assert_eq!(results.len(), 3);
        assert!(results[0].is_valid);
        assert!(!results[1].is_valid);
        assert!(!results[2].is_valid);
    }

    #[test]
    fn test_sort_items_string() {
        let mut items = vec![
            serde_json::json!({"name": "zebra", "age": 5}),
            serde_json::json!({"name": "apple", "age": 3}),
            serde_json::json!({"name": "banana", "age": 7}),
        ];
        sort_items(&mut items, "name", "asc");
        assert_eq!(items[0]["name"], "apple");
        sort_items(&mut items, "name", "desc");
        assert_eq!(items[0]["name"], "zebra");
    }

    #[test]
    fn test_sort_items_number() {
        let mut items = vec![
            serde_json::json!({"name": "zebra", "age": 5}),
            serde_json::json!({"name": "apple", "age": 3}),
            serde_json::json!({"name": "banana", "age": 7}),
        ];
        sort_items(&mut items, "age", "asc");
        assert_eq!(items[0]["age"], 3);
        sort_items(&mut items, "age", "desc");
        assert_eq!(items[0]["age"], 7);
    }
}
