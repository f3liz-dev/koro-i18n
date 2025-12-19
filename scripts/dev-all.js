#!/usr/bin/env node

import { spawn } from 'child_process';
import { watch } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🚀 Building frontend...');

// Initial build
await execAsync('pnpm run build');
console.log('✅ Frontend built');

// Start wrangler
console.log('🔧 Starting Wrangler...');
const wrangler = spawn('wrangler', ['dev'], {
  stdio: 'inherit',
  shell: true,
});

// Watch for frontend changes and rebuild
console.log('👀 Watching for frontend changes...');
watch('./src', { recursive: true }, async (eventType, filename) => {
  if (filename && (filename.endsWith('.elm') || filename.endsWith('.css') || filename.endsWith('.js'))) {
    console.log(`\n📝 Change detected: ${filename}`);
    console.log('🔨 Rebuilding frontend...');
    try {
      await execAsync('pnpm run build');
      console.log('✅ Frontend rebuilt\n');
    } catch (error) {
      console.error('❌ Build failed:', error.message);
    }
  }
});

// Handle exit
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  wrangler.kill();
  process.exit(0);
});
