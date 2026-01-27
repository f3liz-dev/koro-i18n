/**
 * Translation Status Broadcasting Utilities
 * 
 * Helper functions to broadcast translation status changes to connected clients
 * via the TranslationStatusDO Durable Object.
 */

import type { Env } from './context';
import type { StatusUpdateEvent } from '../durable-objects/TranslationStatusDO';

/**
 * Get the Durable Object stub for a project's status broadcasting
 */
export function getTranslationStatusDO(env: Env, projectId: string) {
  const id = env.TRANSLATION_STATUS.idFromName(projectId);
  return env.TRANSLATION_STATUS.get(id);
}

/**
 * Broadcast a translation status change event
 */
export async function broadcastStatusChange(
  env: Env,
  event: StatusUpdateEvent
): Promise<void> {
  try {
    const stub = getTranslationStatusDO(env, event.projectId);
    const response = await stub.fetch('https://dummy/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      console.error('Failed to broadcast status change:', await response.text());
    }
  } catch (error) {
    console.error('Error broadcasting status change:', error);
    // Don't throw - broadcasting is non-critical
  }
}

/**
 * Broadcast when a translation is approved
 */
export async function broadcastTranslationApproved(
  env: Env,
  projectId: string,
  translation: {
    id: string;
    language: string;
    filename: string;
    key: string;
  },
  userId?: string
): Promise<void> {
  await broadcastStatusChange(env, {
    type: 'translation_approved',
    translationId: translation.id,
    projectId,
    language: translation.language,
    filename: translation.filename,
    key: translation.key,
    status: 'approved',
    userId,
    timestamp: Date.now(),
  });
}

/**
 * Broadcast when a translation status changes
 */
export async function broadcastTranslationStatusChanged(
  env: Env,
  projectId: string,
  translation: {
    id: string;
    language: string;
    filename: string;
    key: string;
    status: 'draft' | 'approved' | 'committed';
  },
  userId?: string
): Promise<void> {
  await broadcastStatusChange(env, {
    type: 'translation_status_changed',
    translationId: translation.id,
    projectId,
    language: translation.language,
    filename: translation.filename,
    key: translation.key,
    status: translation.status,
    userId,
    timestamp: Date.now(),
  });
}

/**
 * Broadcast when translations are committed to GitHub
 */
export async function broadcastTranslationsCommitted(
  env: Env,
  projectId: string,
  translations: Array<{
    id: string;
    language: string;
    filename: string;
    key: string;
  }>,
  userId?: string
): Promise<void> {
  // Broadcast each translation individually
  for (const translation of translations) {
    await broadcastStatusChange(env, {
      type: 'translation_committed',
      translationId: translation.id,
      projectId,
      language: translation.language,
      filename: translation.filename,
      key: translation.key,
      status: 'committed',
      userId,
      timestamp: Date.now(),
    });
  }
}

/**
 * Broadcast when a translation is deleted
 */
export async function broadcastTranslationDeleted(
  env: Env,
  projectId: string,
  translation: {
    id: string;
    language: string;
    filename: string;
    key: string;
  },
  userId?: string
): Promise<void> {
  await broadcastStatusChange(env, {
    type: 'translation_deleted',
    translationId: translation.id,
    projectId,
    language: translation.language,
    filename: translation.filename,
    key: translation.key,
    status: 'draft', // Use draft as fallback since it's deleted
    userId,
    timestamp: Date.now(),
  });
}

/**
 * Get recent status events for a project (useful for debugging or catching up)
 */
export async function getRecentStatusEvents(
  env: Env,
  projectId: string,
  limit: number = 50
): Promise<StatusUpdateEvent[]> {
  try {
    const stub = getTranslationStatusDO(env, projectId);
    const response = await stub.fetch(
      `https://dummy/recent?projectId=${encodeURIComponent(projectId)}&limit=${limit}`
    );

    if (!response.ok) {
      console.error('Failed to get recent events:', await response.text());
      return [];
    }

    const data = await response.json() as { events: StatusUpdateEvent[] };
    return data.events;
  } catch (error) {
    console.error('Error getting recent events:', error);
    return [];
  }
}

/**
 * Get connection statistics for a project (for monitoring/debugging)
 */
export async function getConnectionStats(
  env: Env,
  projectId: string
): Promise<{
  connectionCount: number;
  recentEventCount: number;
  connections: Array<{ projectId: string; languages?: string[]; filenames?: string[]; age: number }>;
}> {
  try {
    const stub = getTranslationStatusDO(env, projectId);
    const response = await stub.fetch('https://dummy/stats');

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting connection stats:', error);
    return {
      connectionCount: 0,
      recentEventCount: 0,
      connections: [],
    };
  }
}
