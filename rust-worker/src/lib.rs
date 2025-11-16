use worker::*;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use hex;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use uuid::Uuid;

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
pub struct UploadRequest {
    pub project_id: String,
    pub branch: String,
    pub commit_sha: String,
    pub files: Vec<FileToUpload>,
}

#[derive(Serialize, Deserialize)]
pub struct FileToUpload {
    pub lang: String,
    pub filename: String,
    pub contents: serde_json::Value,
    pub metadata: String,  // Base64-encoded MessagePack
    pub source_hash: String,
    pub packed_data: Option<String>,  // Optional pre-packed base64 data
}

#[derive(Serialize, Deserialize)]
pub struct UploadResponse {
    pub success: bool,
    pub uploaded_files: Vec<String>,
    pub r2_keys: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct D1FileRecord {
    pub id: String,
    pub project_id: String,
    pub branch: String,
    pub commit_sha: String,
    pub lang: String,
    pub filename: String,
    pub r2_key: String,
    pub source_hash: String,
    pub total_keys: i32,
    pub uploaded_at: String,
    pub last_updated: String,
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

/// Generate R2 key for a file
fn generate_r2_key(project_id: &str, lang: &str, filename: &str) -> String {
    let sanitized_filename = filename.replace(['/', '\\'], "-");
    format!("{}-{}-{}", project_id, lang, sanitized_filename)
}

/// Handle file upload to R2 and D1
async fn handle_upload(
    mut req: Request,
    env: &Env,
    _ctx: &Context,
) -> Result<Response> {
    console_log!("Processing upload request");
    
    let upload_req: UploadRequest = req.json().await?;
    
    // Get R2 bucket binding
    let bucket = env.bucket("TRANSLATION_BUCKET")?;
    
    // Get D1 database binding
    let db = env.d1("DB")?;
    
    let mut uploaded_files = Vec::new();
    let mut r2_keys = Vec::new();
    let now = chrono::Utc::now().to_rfc3339();
    
    // Upload each file to R2
    for file in &upload_req.files {
        let r2_key = generate_r2_key(&upload_req.project_id, &file.lang, &file.filename);
        
        // Prepare data to store
        let data_to_store: Vec<u8> = if let Some(ref packed_data) = file.packed_data {
            // Client sent pre-packed data, just decode base64
            BASE64.decode(packed_data)
                .map_err(|e| worker::Error::RustError(format!("Failed to decode packed data: {}", e)))?
        } else {
            // Pack on server (fallback)
            let file_data = serde_json::json!({
                "raw": file.contents,
                "metadataBase64": file.metadata,
                "sourceHash": file.source_hash,
                "commitSha": upload_req.commit_sha,
                "uploadedAt": now,
            });
            
            rmp_serde::to_vec(&file_data)
                .map_err(|e| worker::Error::RustError(format!("Failed to pack data: {}", e)))?
        };
        
        // Prepare custom metadata as HashMap
        let mut custom_meta = std::collections::HashMap::new();
        custom_meta.insert("project".to_string(), upload_req.project_id.clone());
        custom_meta.insert("lang".to_string(), file.lang.clone());
        custom_meta.insert("filename".to_string(), file.filename.clone());
        custom_meta.insert("commitSha".to_string(), upload_req.commit_sha.clone());
        custom_meta.insert("sourceHash".to_string(), file.source_hash.clone());
        custom_meta.insert("uploadedAt".to_string(), now.clone());
        
        // Store to R2
        bucket.put(&r2_key, data_to_store)
            .http_metadata(worker::HttpMetadata {
                content_type: Some("application/msgpack".to_string()),
                ..Default::default()
            })
            .custom_metadata(custom_meta)
            .execute()
            .await?;
        
        uploaded_files.push(format!("{}/{}", file.lang, file.filename));
        r2_keys.push(r2_key.clone());
        
        console_log!("Uploaded file to R2: {}", r2_key);
    }
    
    // Update D1 index using batch insert
    let mut d1_records = Vec::new();
    for file in &upload_req.files {
        let id = Uuid::new_v4().to_string();
        let r2_key = generate_r2_key(&upload_req.project_id, &file.lang, &file.filename);
        let total_keys = if let Some(obj) = file.contents.as_object() {
            obj.len() as i32
        } else {
            0
        };
        
        d1_records.push(D1FileRecord {
            id,
            project_id: upload_req.project_id.clone(),
            branch: upload_req.branch.clone(),
            commit_sha: upload_req.commit_sha.clone(),
            lang: file.lang.clone(),
            filename: file.filename.clone(),
            r2_key,
            source_hash: file.source_hash.clone(),
            total_keys,
            uploaded_at: now.clone(),
            last_updated: now.clone(),
        });
    }
    
    // Build batch INSERT statement
    let values: Vec<String> = d1_records.iter().map(|record| {
        format!(
            "('{}', '{}', '{}', '{}', '{}', '{}', '{}', '{}', {}, '{}', '{}')",
            record.id,
            record.project_id,
            record.branch,
            record.commit_sha,
            record.lang,
            record.filename,
            record.r2_key,
            record.source_hash,
            record.total_keys,
            record.uploaded_at,
            record.last_updated
        )
    }).collect();
    
    let sql = format!(
        "INSERT INTO R2File (
            id, projectId, branch, commitSha, lang, filename, 
            r2Key, sourceHash, totalKeys, uploadedAt, lastUpdated
        ) VALUES {}
        ON CONFLICT(projectId, branch, lang, filename) 
        DO UPDATE SET
            commitSha = excluded.commitSha,
            r2Key = excluded.r2Key,
            sourceHash = excluded.sourceHash,
            totalKeys = excluded.totalKeys,
            lastUpdated = excluded.lastUpdated",
        values.join(",")
    );
    
    // Execute D1 batch insert
    db.prepare(&sql).run().await?;
    
    console_log!("D1 index updated for {} files", d1_records.len());
    
    Response::from_json(&UploadResponse {
        success: true,
        uploaded_files,
        r2_keys,
    })
}

#[event(fetch)]
async fn main(mut req: Request, env: Env, ctx: Context) -> Result<Response> {
    // Log request
    console_log!("Rust compute worker received request: {} {}", req.method(), req.path());

    // Parse URL path
    let url = req.url()?;
    let path = url.path();

    match (req.method(), path) {
        (Method::Post, "/upload") => {
            // Handle file upload to R2 and D1
            handle_upload(req, &env, &ctx).await
        }
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
                "version": "0.2.0"
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
