use worker::*;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use hex;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use uuid::Uuid;
use rmp_serde;

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

#[derive(Serialize, Deserialize)]
pub struct SortRequest {
    pub items: Vec<serde_json::Value>,
    pub sort_by: String,
    pub order: Option<String>, // "asc" or "desc", default "asc"
}

#[derive(Serialize, Deserialize)]
pub struct SortResponse {
    pub sorted: Vec<serde_json::Value>,
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

// Helper: Count keys and bytes for a given FileToUpload
fn count_keys_and_bytes(file: &FileToUpload) -> Result<(usize, usize), String> {
    // Keys count
    let mut keys: usize = 0;
    let mut bytes: usize = 0;

    if let Some(ref packed) = file.packed_data {
        let decoded = BASE64.decode(packed).map_err(|e| format!("Failed to decode base64: {}", e))?;
        bytes = decoded.len();

        let v: serde_json::Value = rmp_serde::from_slice(&decoded)
            .map_err(|e| format!("Failed to decode msgpack: {}", e))?;

        if let Some(raw) = v.get("raw") {
            if let Some(obj) = raw.as_object() {
                keys = obj.len();
            }
        } else if let Some(obj) = v.as_object() {
            keys = obj.len();
        }
    } else {
        if let Some(obj) = file.contents.as_object() {
            keys = obj.len();
            bytes = serde_json::to_vec(&file.contents).map(|b| b.len()).unwrap_or(0);
        }
    }

    Ok((keys, bytes))
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

/// Sort items by a specific field
/// Useful for large datasets that would exceed frontend memory/CPU limits
pub fn sort_items(
    items: &mut Vec<serde_json::Value>,
    sort_by: &str,
    order: &str,
) {
    items.sort_by(|a, b| {
        let a_val = &a[sort_by];
        let b_val = &b[sort_by];
        
        let comparison = match (a_val, b_val) {
            (serde_json::Value::String(a_str), serde_json::Value::String(b_str)) => {
                a_str.cmp(b_str)
            }
            (serde_json::Value::Number(a_num), serde_json::Value::Number(b_num)) => {
                // Compare as f64 for consistency
                let a_f = a_num.as_f64().unwrap_or(0.0);
                let b_f = b_num.as_f64().unwrap_or(0.0);
                a_f.partial_cmp(&b_f).unwrap_or(std::cmp::Ordering::Equal)
            }
            (serde_json::Value::Bool(a_bool), serde_json::Value::Bool(b_bool)) => {
                a_bool.cmp(b_bool)
            }
            _ => std::cmp::Ordering::Equal,
        };
        
        if order == "desc" {
            comparison.reverse()
        } else {
            comparison
        }
    });
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

    // Validate per-file counts and sizes before doing heavy work
    const MAX_KEYS_PER_FILE: usize = 10_000;
    const MAX_TOTAL_KEYS: usize = 200_000;
    const MAX_BYTES_PER_FILE: usize = 5 * 1024 * 1024; // 5 MiB
    const MAX_TOTAL_BYTES: usize = 50 * 1024 * 1024; // 50 MiB

    // Calculate totals using helper
    let mut total_keys: usize = 0;
    let mut total_bytes: usize = 0;

    for file in &upload_req.files {
        match count_keys_and_bytes(file) {
            Ok((keys, bytes)) => {
                if keys > MAX_KEYS_PER_FILE {
                    return Response::error(&format!("File {} has too many keys: {}. Max {}", file.filename, keys, MAX_KEYS_PER_FILE), 413);
                }

                if bytes > MAX_BYTES_PER_FILE {
                    return Response::error(&format!("File {} is too large ({} bytes). Max {}", file.filename, bytes, MAX_BYTES_PER_FILE), 413);
                }

                total_keys += keys;
                total_bytes += bytes;
            }
            Err(err) => {
                return Response::error(&format!("Invalid packed data for {}: {}", file.filename, err), 400);
            }
        }
    }

    if total_keys > MAX_TOTAL_KEYS {
        return Response::error(&format!("Total key count exceeds limit: {}. Max {}", total_keys, MAX_TOTAL_KEYS), 413);
    }

    if total_bytes > MAX_TOTAL_BYTES {
        return Response::error(&format!("Total upload size too large: {} bytes. Max {}", total_bytes, MAX_TOTAL_BYTES), 413);
    }
    
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
        (Method::Post, "/sort") => {
            // Sort large datasets
            let mut request: SortRequest = req.json().await?;
            let order = request.order.as_deref().unwrap_or("asc");
            sort_items(&mut request.items, &request.sort_by, order);
            Response::from_json(&SortResponse { sorted: request.items })
        }
        (Method::Get, "/health") => {
            Response::from_json(&serde_json::json!({
                "status": "ok",
                "worker": "rust-compute-worker",
                "version": "0.3.0"
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

    #[test]
    fn test_sort_items_string() {
        let mut items = vec![
            serde_json::json!({"name": "zebra", "age": 5}),
            serde_json::json!({"name": "apple", "age": 3}),
            serde_json::json!({"name": "banana", "age": 7}),
        ];
        
        sort_items(&mut items, "name", "asc");
        assert_eq!(items[0]["name"], "apple");
        assert_eq!(items[1]["name"], "banana");
        assert_eq!(items[2]["name"], "zebra");
        
        sort_items(&mut items, "name", "desc");
        assert_eq!(items[0]["name"], "zebra");
        assert_eq!(items[1]["name"], "banana");
        assert_eq!(items[2]["name"], "apple");
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
        assert_eq!(items[1]["age"], 5);
        assert_eq!(items[2]["age"], 7);
        
        sort_items(&mut items, "age", "desc");
        assert_eq!(items[0]["age"], 7);
        assert_eq!(items[1]["age"], 5);
        assert_eq!(items[2]["age"], 3);
    }

    #[test]
    fn test_count_keys_and_bytes_contents() {
        let file = FileToUpload {
            lang: "en".to_string(),
            filename: "common.json".to_string(),
            contents: serde_json::json!({"a": "A", "b": "B"}),
            metadata: "".to_string(),
            source_hash: "".to_string(),
            packed_data: None,
        };

        let (keys, bytes) = count_keys_and_bytes(&file).expect("should parse contents");
        assert_eq!(keys, 2);
        assert!(bytes > 0);
    }

    #[test]
    fn test_count_keys_and_bytes_packed() {
        let payload = serde_json::json!({ "raw": {"k1": "v1", "k2": "v2"} });
        let packed = rmp_serde::to_vec(&payload).unwrap();
        let packed_b64 = BASE64.encode(&packed);

        let file = FileToUpload {
            lang: "en".to_string(),
            filename: "common.json".to_string(),
            contents: serde_json::json!({}),
            metadata: "".to_string(),
            source_hash: "".to_string(),
            packed_data: Some(packed_b64),
        };

        let (keys, bytes) = count_keys_and_bytes(&file).expect("should parse packed data");
        assert_eq!(keys, 2);
        assert_eq!(bytes, packed.len());
    }

    #[test]
    fn test_count_keys_large() {
        let mut obj = serde_json::Map::new();
        for i in 0..10001 {
            obj.insert(i.to_string(), serde_json::Value::String("x".to_string()));
        }

        let file = FileToUpload {
            lang: "en".to_string(),
            filename: "big.json".to_string(),
            contents: serde_json::Value::Object(obj),
            metadata: "".to_string(),
            source_hash: "".to_string(),
            packed_data: None,
        };

        let (keys, _) = count_keys_and_bytes(&file).expect("should parse big file");
        assert_eq!(keys, 10001);
    }
}
