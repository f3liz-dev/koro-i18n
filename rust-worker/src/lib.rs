use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use hex;
use rmp_serde;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;
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
    pub source_hash: String,
    pub packed_data: Option<String>,
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

fn count_keys_and_bytes(file: &FileToUpload) -> std::result::Result<(usize, usize), String> {
    let packed = file
        .packed_data
        .as_ref()
        .ok_or_else(|| "packed_data required".to_string())?;
    let decoded = BASE64.decode(packed).map_err(|e| format!("b64: {}", e))?;
    let bytes = decoded.len();
    let v: serde_json::Value =
        rmp_serde::from_slice(&decoded).map_err(|e| format!("msgpack: {}", e))?;
    let keys = v
        .get("raw")
        .and_then(|r| r.as_object().map(|o| o.len()))
        .or_else(|| v.as_object().map(|o| o.len()))
        .unwrap_or(0);
    Ok((keys, bytes))
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

fn generate_r2_key(project_id: &str, lang: &str, filename: &str) -> String {
    let sanitized = filename.replace(['/', '\\'], "-");
    format!("{}-{}-{}", project_id, lang, sanitized)
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

// Pre-calculate and cache complex responses or metadata
async fn pre_cache_file_metadata(
    bucket: &Bucket,
    project_id: &str,
    lang: &str,
    filename: &str,
    keys: usize,
    source_hash: &str,
) -> Result<()> {
    // Create a lightweight metadata object for fast listing/filtering
    let cache_key = format!("meta-{}-{}-{}", project_id, lang, filename);
    let metadata = serde_json::json!({
        "projectId": project_id,
        "lang": lang,
        "filename": filename,
        "keys": keys,
        "sourceHash": source_hash,
        "updatedAt": chrono::Utc::now().to_rfc3339()
    });

    // Store in R2 with short TTL or just rely on R2's speed
    // This avoids hitting D1 for simple file existence checks
    bucket
        .put(&cache_key, serde_json::to_vec(&metadata)?)
        .http_metadata(worker::HttpMetadata {
            content_type: Some("application/json".to_string()),
            ..Default::default()
        })
        .execute()
        .await?;

    Ok(())
}

async fn handle_upload(mut req: Request, env: &Env, _ctx: &Context) -> Result<Response> {
    // Log deprecation warning
    console_log!("[DEPRECATED] /upload endpoint is deprecated. Files should be fetched directly from GitHub using user's access token.");
    
    let upload_req: UploadRequest = req.json().await?;
    let bucket = env.bucket("TRANSLATION_BUCKET")?;
    let db = env.d1("DB")?;
    let now = chrono::Utc::now().to_rfc3339();

    const MAX_KEYS_PER_FILE: usize = 10_000;
    const MAX_TOTAL_KEYS: usize = 200_000;
    const MAX_BYTES_PER_FILE: usize = 5 * 1024 * 1024;
    const MAX_TOTAL_BYTES: usize = 50 * 1024 * 1024;

    let mut total_keys = 0usize;
    let mut total_bytes = 0usize;

    for f in &upload_req.files {
        let (keys, bytes) = match count_keys_and_bytes(f) {
            Ok(v) => v,
            Err(e) => {
                return Response::error(
                    &format!("Invalid packed data for {}: {}", f.filename, e),
                    400,
                )
            }
        };
        if keys > MAX_KEYS_PER_FILE {
            return Response::error(
                &format!("File {} has too many keys: {}", f.filename, keys),
                413,
            );
        }
        if bytes > MAX_BYTES_PER_FILE {
            return Response::error(&format!("File {} is too large: {}", f.filename, bytes), 413);
        }
        total_keys += keys;
        total_bytes += bytes;
    }

    if total_keys > MAX_TOTAL_KEYS {
        return Response::error(
            &format!("Total key count exceeds limit: {}", total_keys),
            413,
        );
    }
    if total_bytes > MAX_TOTAL_BYTES {
        return Response::error(
            &format!("Total upload size too large: {}", total_bytes),
            413,
        );
    }

    let mut uploaded = Vec::new();
    let mut r2_keys = Vec::new();
    let mut d1_records = Vec::new();

    for f in &upload_req.files {
        let key = generate_r2_key(&upload_req.project_id, &f.lang, &f.filename);
        let decoded = BASE64
            .decode(f.packed_data.as_ref().unwrap())
            .map_err(|e| {
                worker::Error::RustError(format!("Failed to decode packed data: {}", e))
            })?;
        let main_bytes = decoded.clone();
        let misc_key: Option<String> = None;

        let mut meta = std::collections::HashMap::new();
        meta.insert("project".to_string(), upload_req.project_id.clone());
        meta.insert("lang".to_string(), f.lang.clone());
        meta.insert("filename".to_string(), f.filename.clone());
        meta.insert("commitSha".to_string(), upload_req.commit_sha.clone());
        meta.insert("sourceHash".to_string(), f.source_hash.clone());
        meta.insert("uploadedAt".to_string(), now.clone());

        bucket
            .put(&key, main_bytes)
            .http_metadata(worker::HttpMetadata {
                content_type: Some("application/msgpack".to_string()),
                ..Default::default()
            })
            .custom_metadata(meta)
            .execute()
            .await?;

        uploaded.push(format!("{}/{}", f.lang, f.filename));
        r2_keys.push(key.clone());
        if let Some(mk) = misc_key {
            r2_keys.push(mk);
        }

        let (keys, _) = count_keys_and_bytes(f).unwrap_or((0, 0));

        // Dynamic Pre-cache: Store lightweight metadata in R2 for fast access
        if let Err(e) = pre_cache_file_metadata(
            &bucket,
            &upload_req.project_id,
            &f.lang,
            &f.filename,
            keys,
            &f.source_hash,
        )
        .await
        {
            console_log!("Failed to pre-cache metadata for {}: {}", f.filename, e);
        }

        d1_records.push(D1FileRecord {
            id: Uuid::new_v4().to_string(),
            project_id: upload_req.project_id.clone(),
            branch: upload_req.branch.clone(),
            commit_sha: upload_req.commit_sha.clone(),
            lang: f.lang.clone(),
            filename: f.filename.clone(),
            r2_key: key,
            source_hash: f.source_hash.clone(),
            total_keys: keys as i32,
            uploaded_at: now.clone(),
            last_updated: now.clone(),
        });
    }

    let values: Vec<String> = d1_records
        .iter()
        .map(|r| {
            format!(
                "('{}','{}','{}','{}','{}','{}','{}','{}',{},'{}','{}')",
                r.id,
                r.project_id,
                r.branch,
                r.commit_sha,
                r.lang,
                r.filename,
                r.r2_key,
                r.source_hash,
                r.total_keys,
                r.uploaded_at,
                r.last_updated
            )
        })
        .collect();

    let sql = format!(
        "INSERT INTO R2File (id, projectId, branch, commitSha, lang, filename, r2Key, sourceHash, totalKeys, uploadedAt, lastUpdated) VALUES {} ON CONFLICT(projectId, branch, lang, filename) DO UPDATE SET commitSha = excluded.commitSha, r2Key = excluded.r2Key, sourceHash = excluded.sourceHash, totalKeys = excluded.totalKeys, lastUpdated = excluded.lastUpdated",
        values.join(",")
    );

    db.prepare(&sql).run().await?;
    Response::from_json(&UploadResponse {
        success: true,
        uploaded_files: uploaded,
        r2_keys,
    })
}

#[derive(Serialize, Deserialize)]
pub struct MiscGitRequest {
    pub project_id: String,
    pub r2_key: String,
    pub metadata_base64: String,
    pub lang: Option<String>,
    pub filename: Option<String>,
}

async fn handle_upload_misc_git(mut req: Request, env: &Env, _ctx: &Context) -> Result<Response> {
    let body: MiscGitRequest = req.json().await?;
    let bucket = env.bucket("TRANSLATION_BUCKET")?;
    let decoded = BASE64.decode(&body.metadata_base64).map_err(|e| {
        worker::Error::RustError(format!("Failed to decode metadata_base64: {}", e))
    })?;
    let key = format!("{}-misc-git", body.r2_key);
    let mut meta = std::collections::HashMap::new();
    meta.insert("project".to_string(), body.project_id.clone());
    if let Some(lang) = body.lang {
        meta.insert("lang".to_string(), lang);
    }
    if let Some(filename) = body.filename {
        meta.insert("filename".to_string(), filename);
    }

    // Store misc metadata to R2
    bucket
        .put(&key, decoded)
        .http_metadata(worker::HttpMetadata {
            content_type: Some("application/msgpack".to_string()),
            ..Default::default()
        })
        .custom_metadata(meta)
        .execute()
        .await?;

    // Also persist misc r2 key to D1 so cleanup and tooling know the exact misc object name.
    // This is best-effort: log warnings on failure but do not fail the request.
    if let Ok(db) = env.d1("DB") {
        let update_sql = format!(
            "UPDATE R2File SET miscR2Key = '{}' WHERE r2Key = '{}'",
            key.replace("'", "''"),
            body.r2_key.replace("'", "''")
        );
        match db.prepare(&update_sql).run().await {
            Ok(_) => {
                // updated (or no-op if no matching row)
                // nothing else to do
            }
            Err(e) => {
                // Log but continue
                worker::console_log!("[misc-git] failed to update D1 miscR2Key: {}", e);
            }
        }
    } else {
        worker::console_log!("[misc-git] D1 not available in environment; skipping D1 update");
    }

    Response::from_json(&serde_json::json!({ "success": true, "r2_key": key }))
}

#[event(fetch)]
async fn main(mut req: Request, env: Env, ctx: Context) -> Result<Response> {
    let url = req.url()?;
    match (req.method(), url.path()) {
        (Method::Post, "/upload") => {
            // DEPRECATED: This endpoint is deprecated in favor of fetching files directly from GitHub
            handle_upload(req, &env, &ctx).await
        }
        (Method::Post, "/upload-misc-git") => {
            // DEPRECATED: This endpoint is deprecated in favor of fetching files directly from GitHub
            handle_upload_misc_git(req, &env, &ctx).await
        }
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

    #[test]
    fn test_count_keys_and_bytes_packed() {
        let payload = serde_json::json!({ "raw": {"k1": "v1", "k2": "v2"} });
        let packed = rmp_serde::to_vec(&payload).unwrap();
        let packed_b64 = BASE64.encode(&packed);
        let file = FileToUpload {
            lang: "en".to_string(),
            filename: "common.json".to_string(),
            contents: serde_json::json!({}),
            source_hash: "".to_string(),
            packed_data: Some(packed_b64),
        };
        let (keys, bytes) = count_keys_and_bytes(&file).expect("should parse packed data");
        assert_eq!(keys, 2);
        assert_eq!(bytes, packed.len());
    }

    #[test]
    fn test_count_keys_and_bytes_contents() {
        let payload = serde_json::json!({ "raw": {"a": "A", "b": "B"} });
        let packed = rmp_serde::to_vec(&payload).unwrap();
        let packed_b64 = BASE64.encode(&packed);
        let file = FileToUpload {
            lang: "en".to_string(),
            filename: "common.json".to_string(),
            contents: serde_json::json!({}),
            source_hash: "".to_string(),
            packed_data: Some(packed_b64),
        };
        let (keys, bytes) =
            count_keys_and_bytes(&file).expect("should parse contents via packed_data");
        assert_eq!(keys, 2);
        assert!(bytes > 0);
    }

    #[test]
    fn test_count_keys_large() {
        let mut obj = serde_json::Map::new();
        for i in 0..10001 {
            obj.insert(i.to_string(), serde_json::Value::String("x".to_string()));
        }
        let payload = serde_json::json!({ "raw": serde_json::Value::Object(obj) });
        let packed = rmp_serde::to_vec(&payload).unwrap();
        let packed_b64 = BASE64.encode(&packed);
        let file = FileToUpload {
            lang: "en".to_string(),
            filename: "big.json".to_string(),
            contents: serde_json::Value::Object(serde_json::Map::new()),
            source_hash: "".to_string(),
            packed_data: Some(packed_b64),
        };
        let (keys, _) = count_keys_and_bytes(&file).expect("should parse big file");
        assert_eq!(keys, 10001);
    }
}
