/**
 * EXAMPLE: Integrating Translation Status Broadcasting
 * 
 * This file demonstrates how to add real-time status broadcasting
 * to existing translation API endpoints.
 * 
 * ⚠️ This is an EXAMPLE file - not meant to be used directly.
 * Copy the patterns below into your actual route files.
 */

import { broadcastTranslationApproved, broadcastTranslationStatusChanged } from '../lib/translation-status-broadcast';
import type { ProjectAppContext } from '../lib/context';

// ============================================================================
// EXAMPLE 1: Update Translation Status Endpoint
// ============================================================================
// Location: src/routes/project-translations.ts
// After updating status in database, broadcast the change

async function updateTranslationStatusExample(c: ProjectAppContext) {
  const env = c.env;
  const project = c.get('project');
  const user = c.get('user');
  
  // ... existing code to update translation in database ...
  const translation = {
    id: 'translation-id',
    language: 'ko',
    filename: 'common.json',
    key: 'hello',
    status: 'approved' as const,
  };
  
  // ✅ ADD THIS: Broadcast status change to connected clients
  await broadcastTranslationApproved(
    env,
    project.id,
    translation,
    user.userId
  );
  
  return c.json({ success: true });
}

// ============================================================================
// EXAMPLE 2: Create Translation Endpoint
// ============================================================================
// Location: src/routes/project-translations.ts
// After creating a new translation, broadcast it

async function createTranslationExample(c: ProjectAppContext) {
  const env = c.env;
  const project = c.get('project');
  const user = c.get('user');
  
  // ... existing code to create translation in database ...
  const translation = {
    id: 'new-translation-id',
    language: 'ko',
    filename: 'common.json',
    key: 'hello',
    status: 'draft' as const,
  };
  
  // ✅ ADD THIS: Broadcast new translation
  await broadcastTranslationStatusChanged(
    env,
    project.id,
    translation,
    user.userId
  );
  
  return c.json({ success: true });
}

// ============================================================================
// EXAMPLE 3: Bulk Approve Translations
// ============================================================================
// Location: src/routes/project-translations.ts
// When approving multiple translations

async function bulkApproveExample(c: ProjectAppContext) {
  const env = c.env;
  const project = c.get('project');
  const user = c.get('user');
  
  // ... existing code to approve translations in database ...
  const translations = [
    { id: '1', language: 'ko', filename: 'common.json', key: 'hello', status: 'approved' as const },
    { id: '2', language: 'ko', filename: 'common.json', key: 'world', status: 'approved' as const },
  ];
  
  // ✅ ADD THIS: Broadcast each approval
  for (const translation of translations) {
    await broadcastTranslationApproved(
      env,
      project.id,
      translation,
      user.userId
    );
  }
  
  return c.json({ success: true });
}

// ============================================================================
// EXAMPLE 4: WebSocket Connection Endpoint
// ============================================================================
// Add a new route to handle WebSocket connections

import { createApp } from '../lib/context';

export const statusRoutes = createApp();

// GET /api/projects/:project/status/ws
// Upgrade to WebSocket for real-time updates
statusRoutes.get('/:project/status/ws', async (c) => {
  const env = c.env;
  const project = c.get('project');
  
  // Get the Durable Object for this project
  const id = env.TRANSLATION_STATUS.idFromName(project.id);
  const stub = env.TRANSLATION_STATUS.get(id);
  
  // Forward the WebSocket upgrade request to the Durable Object
  // Include projectId in query params
  const url = new URL(c.req.url);
  const wsUrl = `https://dummy/ws?projectId=${encodeURIComponent(project.id)}`;
  
  return stub.fetch(wsUrl, {
    headers: c.req.raw.headers,
  });
});

// ============================================================================
// CLIENT-SIDE EXAMPLE: Connect to WebSocket
// ============================================================================
// Location: Frontend code

const exampleClientCode = `
// Connect to status WebSocket
const projectId = 'my-project-id';
const token = 'user-jwt-token';
const ws = new WebSocket(
  \`wss://your-worker.workers.dev/api/projects/\${projectId}/status/ws\`,
  {
    headers: {
      'Authorization': \`Bearer \${token}\`
    }
  }
);

ws.onopen = () => {
  console.log('Connected to status updates');
  
  // Optional: Subscribe to specific languages/files
  ws.send(JSON.stringify({
    type: 'subscribe',
    languages: ['ko', 'ja'],
    filenames: ['common.json']
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'history') {
    // Received recent events on connection
    console.log('Recent events:', data.events);
  } else if (data.type === 'translation_approved') {
    // A translation was approved
    console.log('Translation approved:', data);
    // Update UI: change status badge, move to approved list, etc.
  } else if (data.type === 'translation_status_changed') {
    // Status changed (draft/approved/committed)
    console.log('Status changed:', data);
    // Update UI accordingly
  } else if (data.type === 'translation_committed') {
    // Translation committed to GitHub
    console.log('Translation committed:', data);
    // Update UI: show as synced
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket closed');
  // Implement reconnection logic if needed
};

// Keep connection alive with ping
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 30000); // Every 30 seconds
`;

// ============================================================================
// EXAMPLE 5: Add to workers.ts (Export Durable Object)
// ============================================================================
// Location: src/workers.ts

const workerExportExample = `
// Import the Durable Object class
import { TranslationStatusDO } from './durable-objects/TranslationStatusDO';

// Export it so Cloudflare Workers can instantiate it
export { TranslationStatusDO };

// Also export other Durable Objects
export { OAuthStateDO } from './durable-objects/OAuthStateDO';
export { JWKSCacheDO } from './durable-objects/JWKSCacheDO';
export { GitHubRateLimitDO } from './durable-objects/GitHubRateLimitDO';
`;
