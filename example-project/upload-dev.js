#!/usr/bin/env node

/**
 * Development upload script - uploads files using JWT token
 * 
 * ⚠️ IMPORTANT: This script only works in DEVELOPMENT environment!
 * JWT uploads are disabled in production for security reasons.
 * For production deployments, use OIDC authentication via GitHub Actions.
 * 
 * Usage: JWT_TOKEN=<token> node upload-dev.js
 */

import { loadConfig, processFile, upload } from '@koro-i18n/client';
import { glob } from 'glob';

const JWT_TOKEN = process.env.JWT_TOKEN;

if (!JWT_TOKEN) {
  console.error('❌ Error: JWT token required\n');
  console.error('Usage:');
  console.error('  JWT_TOKEN=<token> node upload-dev.js\n');
  console.error('How to get your JWT token:');
  console.error('  1. Open http://localhost:5173 and sign in');
  console.error('  2. Press F12 to open DevTools');
  console.error('  3. Go to Console tab');
  console.error('  4. Paste this code and press Enter:\n');
  console.error('     document.cookie.split("; ").find(row => row.startsWith("auth_token=")).split("=")[1]\n');
  console.error('  5. Copy the output (your JWT token)');
  console.error('  6. Run: JWT_TOKEN=YOUR_TOKEN node upload-dev.js\n');
  console.error('See docs/GET_JWT_TOKEN.md for detailed instructions');
  process.exit(1);
}

async function main() {
  const config = loadConfig('.koro-i18n.repo.config.toml');
  
  // Configurable chunk size (default 50, can be overridden via env var)
  const chunkSize = parseInt(process.env.UPLOAD_CHUNK_SIZE || '50', 10);
  
  console.log(`📦 Processing files for ${config.project.name}...`);

  const allFiles = [];

  for (const pattern of config.source.files) {
    const files = await glob(pattern);
    console.log(`Found ${files.length} files matching ${pattern}`);

    for (const filePath of files) {
      const processed = processFile(filePath);
      if (processed) {
        allFiles.push(processed);
        console.log(`  ✓ ${filePath} (${Object.keys(processed.contents).length} keys)`);
      }
    }
  }

  console.log(`\n📤 Uploading ${allFiles.length} files (chunk size: ${chunkSize})...`);
  await upload(config.project.name, allFiles, config.project.platform_url, JWT_TOKEN, chunkSize);
  console.log('✨ Done!');
}

main().catch(error => {
  console.error('❌ Upload error:', error.message);
  process.exit(1);
});
