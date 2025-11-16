use worker::*;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use hex;

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

/// Compute SHA-256 hash for a single value (16 chars prefix)
/// This matches the hashValue function in TypeScript
pub fn hash_value(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    let result = hasher.finalize();
    let hex_string = hex::encode(result);
    // Return first 16 characters to match TypeScript implementation
    hex_string[..16].to_string()
}

/// Batch compute hashes for multiple values
/// Significantly faster than computing individually
pub fn batch_hash_values(values: &[String]) -> Vec<String> {
    values.iter().map(|v| hash_value(v)).collect()
}

/// Validate translations in batch against source hashes
/// Returns validation results for each translation
pub fn batch_validate_translations(
    translations: &[TranslationToValidate],
    source_hashes: &std::collections::HashMap<String, String>,
) -> Vec<ValidationResult> {
    translations
        .iter()
        .map(|translation| {
            // Check if source hash exists for this key
            match source_hashes.get(&translation.key) {
                None => ValidationResult {
                    id: translation.id.clone(),
                    is_valid: false,
                    reason: Some("Key no longer exists in source".to_string()),
                },
                Some(current_hash) => {
                    // Check if translation has source tracking
                    match &translation.source_hash {
                        None => ValidationResult {
                            id: translation.id.clone(),
                            is_valid: false,
                            reason: Some("Translation missing source tracking".to_string()),
                        },
                        Some(trans_hash) => {
                            // Compare hashes
                            if trans_hash != current_hash {
                                ValidationResult {
                                    id: translation.id.clone(),
                                    is_valid: false,
                                    reason: Some("Source value changed".to_string()),
                                }
                            } else {
                                ValidationResult {
                                    id: translation.id.clone(),
                                    is_valid: true,
                                    reason: None,
                                }
                            }
                        }
                    }
                }
            }
        })
        .collect()
}

#[event(fetch)]
async fn main(mut req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    // Log request
    console_log!("Rust compute worker received request: {} {}", req.method(), req.path());

    // Parse URL path
    let url = req.url()?;
    let path = url.path();

    match (req.method(), path) {
        (Method::Post, "/hash") => {
            // Batch hash computation
            let request: HashRequest = req.json().await?;
            let hashes = batch_hash_values(&request.values);
            Response::from_json(&HashResponse { hashes })
        }
        (Method::Post, "/validate") => {
            // Batch translation validation
            let request: ValidationRequest = req.json().await?;
            let results = batch_validate_translations(&request.translations, &request.source_hashes);
            Response::from_json(&ValidationResponse { results })
        }
        (Method::Get, "/health") => {
            Response::from_json(&serde_json::json!({
                "status": "ok",
                "worker": "rust-compute-worker",
                "version": "0.1.0"
            }))
        }
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
        
        // Test consistency
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
        assert!(results[0].is_valid); // Matching hash
        assert!(!results[1].is_valid); // Hash mismatch
        assert!(!results[2].is_valid); // Key not found
    }
}
