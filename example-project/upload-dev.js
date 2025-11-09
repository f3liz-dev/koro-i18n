#!/usr/bin/env node

/**
 * Development upload script - uploads files using JWT token
 * Usage: node upload-dev.js <jwt-token>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PLATFORM_URL = process.env.I18N_PLATFORM_URL || 'http://localhost:8787';
const PROJECT_NAME = 'example-project';
const JWT_TOKEN = process.argv[2] || process.env.JWT_TOKEN;

if (!JWT_TOKEN) {
  console.error('❌ Error: JWT token required\n');
  console.error('Usage:');
  console.error('  node upload-dev.js <jwt-token>');
  console.error('  JWT_TOKEN=<token> node upload-dev.js\n');
  console.error('How to get your JWT token:');
  console.error('  1. Open http://localhost:5173 and sign in');
  console.error('  2. Press F12 to open DevTools');
  console.error('  3. Go to Console tab');
  console.error('  4. Paste this code and press Enter:\n');
  console.error('     document.cookie.split("; ").find(row => row.startsWith("auth_token=")).split("=")[1]\n');
  console.error('  5. Copy the output (your JWT token)');
  console.error('  6. Run: node upload-dev.js YOUR_TOKEN\n');
  console.error('See docs/GET_JWT_TOKEN.md for detailed instructions');
  process.exit(1);
}

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

// Upload to platform
async function upload() {
  console.log('🔍 Processing translation files...\n');
  
  const files = processFiles();
  
  console.log(`📦 Found ${files.length} translation files:\n`);
  
  for (const file of files) {
    console.log(`  ${file.lang}/${file.filename} - ${file.metadata.keys} keys`);
  }
  
  console.log(`\n📤 Uploading to ${PLATFORM_URL}...\n`);
  
  const payload = {
    branch: 'main',
    commitSha: 'dev-upload-' + Date.now(),
    files: files
  };
  
  try {
    const response = await fetch(`${PLATFORM_URL}/api/projects/${PROJECT_NAME}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Upload successful!\n');
      console.log('Response:', data);
      console.log(`\n📊 Summary:`);
      console.log(`  - Project: ${data.projectId}`);
      console.log(`  - Files uploaded: ${data.filesUploaded}`);
      console.log(`  - Total keys: ${files.reduce((sum, f) => sum + f.metadata.keys, 0)}`);
      console.log(`  - Languages: ${[...new Set(files.map(f => f.lang))].join(', ')}`);
    } else {
      console.error('❌ Upload failed!\n');
      console.error('Status:', response.status);
      console.error('Error:', data);
    }
  } catch (error) {
    console.error('❌ Upload error:', error.message);
  }
}

upload().catch(console.error);
