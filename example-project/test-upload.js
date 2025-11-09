#!/usr/bin/env node

/**
 * Test script to simulate file upload to I18n Platform
 * This demonstrates what the client library would do
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PLATFORM_URL = process.env.I18N_PLATFORM_URL || 'http://localhost:8787';
const PROJECT_NAME = 'example-project';

// Read and flatten JSON files
function flattenObject(obj, prefix = '') {
  const flattened = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  }
  
  return flattened;
}

// Process translation files
function processFiles() {
  const files = [];
  const localesDir = path.join(__dirname, 'locales');
  
  // Read all language directories
  const languages = fs.readdirSync(localesDir);
  
  for (const lang of languages) {
    const langDir = path.join(localesDir, lang);
    if (!fs.statSync(langDir).isDirectory()) continue;
    
    // Read all JSON files in language directory
    const jsonFiles = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
    
    for (const filename of jsonFiles) {
      const filePath = path.join(langDir, filename);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const flattened = flattenObject(content);
      
      files.push({
        filetype: 'json',
        filename: filename,
        lang: lang,
        contents: flattened,
        metadata: {
          size: fs.statSync(filePath).size,
          keys: Object.keys(flattened).length,
          originalPath: `locales/${lang}/${filename}`
        }
      });
    }
  }
  
  return files;
}

// Main
async function main() {
  console.log('🔍 Processing translation files...\n');
  
  const files = processFiles();
  
  console.log(`📦 Found ${files.length} translation files:\n`);
  
  for (const file of files) {
    console.log(`  ${file.lang}/${file.filename}`);
    console.log(`    - Keys: ${file.metadata.keys}`);
    console.log(`    - Size: ${file.metadata.size} bytes`);
    console.log(`    - Sample keys: ${Object.keys(file.contents).slice(0, 3).join(', ')}...\n`);
  }
  
  // Prepare upload payload
  const payload = {
    branch: 'main',
    commitSha: 'test-commit-sha',
    files: files
  };
  
  console.log('📤 Upload payload prepared:');
  console.log(`  - Project: ${PROJECT_NAME}`);
  console.log(`  - Files: ${files.length}`);
  console.log(`  - Total keys: ${files.reduce((sum, f) => sum + f.metadata.keys, 0)}`);
  console.log(`  - Languages: ${[...new Set(files.map(f => f.lang))].join(', ')}\n`);
  
  console.log('📋 Example API call:');
  console.log(`POST ${PLATFORM_URL}/api/projects/${PROJECT_NAME}/upload`);
  console.log('Authorization: Bearer YOUR_API_KEY');
  console.log('Content-Type: application/json\n');
  console.log(JSON.stringify(payload, null, 2).substring(0, 500) + '...\n');
  
  console.log('✅ Test complete! Use this payload structure for actual uploads.');
}

main().catch(console.error);
