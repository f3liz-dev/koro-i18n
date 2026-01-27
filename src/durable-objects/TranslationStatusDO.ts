/**
 * Translation Status Durable Object
 * 
 * Manages real-time WebSocket connections for translation status updates.
 * One instance per project to broadcast status changes to all connected clients.
 * 
 * Features:
 * - WebSocket pub/sub for real-time updates
 * - Per-project status broadcasting
 * - Client connection management
 * - Status change history (in-memory)
 */

export interface StatusUpdateEvent {
  type: 'translation_status_changed' | 'translation_approved' | 'translation_committed' | 'translation_deleted';
  translationId: string;
  projectId: string;
  language: string;
  filename: string;
  key: string;
  status: 'draft' | 'approved' | 'committed';
  userId?: string;
  timestamp: number;
}

export interface ClientMessage {
  type: 'ping' | 'subscribe' | 'unsubscribe';
  projectId?: string;
  languages?: string[];
  filenames?: string[];
}

interface Connection {
  webSocket: WebSocket;
  projectId: string;
  languages?: string[];
  filenames?: string[];
  connectedAt: number;
}

export class TranslationStatusDO implements DurableObject {
  private storage: DurableObjectStorage;
  private state: DurableObjectState;
  private connections: Map<string, Connection> = new Map();
  private recentEvents: StatusUpdateEvent[] = [];
  private readonly MAX_RECENT_EVENTS = 100;

  constructor(state: DurableObjectState, env: unknown) {
    this.state = state;
    this.storage = state.storage;
  }

  /**
   * Broadcast a status update to all connected clients
   */
  async broadcast(event: StatusUpdateEvent): Promise<void> {
    // Store in recent events
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.MAX_RECENT_EVENTS) {
      this.recentEvents.shift();
    }

    // Send to matching connections
    let sentCount = 0;
    for (const [id, conn] of this.connections.entries()) {
      // Check if connection is interested in this update
      if (!this.shouldSendToConnection(conn, event)) {
        continue;
      }

      try {
        conn.webSocket.send(JSON.stringify(event));
        sentCount++;
      } catch (error) {
        console.error(`Failed to send to connection ${id}:`, error);
        // Remove dead connection
        this.connections.delete(id);
        try {
          conn.webSocket.close(1011, 'Send failed');
        } catch {
          // Ignore errors on close
        }
      }
    }

    console.log(`Broadcast ${event.type} to ${sentCount}/${this.connections.size} connections`);
  }

  /**
   * Check if a connection should receive this event
   */
  private shouldSendToConnection(conn: Connection, event: StatusUpdateEvent): boolean {
    // Must match project
    if (conn.projectId !== event.projectId) {
      return false;
    }

    // Filter by language if specified
    if (conn.languages && conn.languages.length > 0) {
      if (!conn.languages.includes(event.language)) {
        return false;
      }
    }

    // Filter by filename if specified
    if (conn.filenames && conn.filenames.length > 0) {
      if (!conn.filenames.includes(event.filename)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get recent events (for new connections to catch up)
   */
  getRecentEvents(projectId: string, limit: number = 50): StatusUpdateEvent[] {
    return this.recentEvents
      .filter(e => e.projectId === projectId)
      .slice(-limit);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    connectionCount: number;
    recentEventCount: number;
    connections: Array<{ projectId: string; languages?: string[]; filenames?: string[]; age: number }>;
  } {
    const now = Date.now();
    return {
      connectionCount: this.connections.size,
      recentEventCount: this.recentEvents.length,
      connections: Array.from(this.connections.values()).map(conn => ({
        projectId: conn.projectId,
        languages: conn.languages,
        filenames: conn.filenames,
        age: now - conn.connectedAt,
      })),
    };
  }

  /**
   * HTTP/WebSocket fetch handler
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Handle HTTP requests
    const method = request.method;

    try {
      // POST /broadcast - Broadcast a status update
      if (method === 'POST' && url.pathname === '/broadcast') {
        const event = await request.json() as StatusUpdateEvent;
        await this.broadcast(event);
        return new Response(JSON.stringify({ 
          success: true, 
          connectionCount: this.connections.size 
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // GET /recent - Get recent events
      if (method === 'GET' && url.pathname === '/recent') {
        const projectId = url.searchParams.get('projectId');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        
        if (!projectId) {
          return new Response(JSON.stringify({ error: 'projectId required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const events = this.getRecentEvents(projectId, limit);
        return new Response(JSON.stringify({ events }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // GET /stats - Get connection statistics
      if (method === 'GET' && url.pathname === '/stats') {
        const stats = this.getStats();
        return new Response(JSON.stringify(stats), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal error' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Handle WebSocket connection
   */
  private handleWebSocket(request: Request): Response {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return new Response('Missing projectId', { status: 400 });
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the connection
    server.accept();

    // Generate connection ID
    const connId = crypto.randomUUID();

    // Store connection
    const connection: Connection = {
      webSocket: server,
      projectId,
      connectedAt: Date.now(),
    };
    this.connections.set(connId, connection);

    console.log(`WebSocket connected: ${connId} for project ${projectId}`);

    // Handle messages from client
    server.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data as string) as ClientMessage;
        this.handleClientMessage(connId, message);
      } catch (error) {
        console.error(`Error handling message from ${connId}:`, error);
      }
    });

    // Handle connection close
    server.addEventListener('close', () => {
      console.log(`WebSocket closed: ${connId}`);
      this.connections.delete(connId);
    });

    // Handle errors
    server.addEventListener('error', (error) => {
      console.error(`WebSocket error for ${connId}:`, error);
      this.connections.delete(connId);
    });

    // Send recent events to new connection
    const recentEvents = this.getRecentEvents(projectId, 10);
    if (recentEvents.length > 0) {
      try {
        server.send(JSON.stringify({
          type: 'history',
          events: recentEvents,
        }));
      } catch (error) {
        console.error('Failed to send history:', error);
      }
    }

    // Return the client side of the WebSocket pair
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle messages from client (for filtering updates)
   */
  private handleClientMessage(connId: string, message: ClientMessage): void {
    const conn = this.connections.get(connId);
    if (!conn) return;

    switch (message.type) {
      case 'subscribe':
        // Update filters
        if (message.languages) {
          conn.languages = message.languages;
        }
        if (message.filenames) {
          conn.filenames = message.filenames;
        }
        console.log(`Connection ${connId} subscribed with filters:`, {
          languages: conn.languages,
          filenames: conn.filenames,
        });
        break;

      case 'unsubscribe':
        // Clear filters
        conn.languages = undefined;
        conn.filenames = undefined;
        break;

      case 'ping':
        // Respond to ping
        try {
          conn.webSocket.send(JSON.stringify({ type: 'pong' }));
        } catch (error) {
          console.error('Failed to send pong:', error);
        }
        break;
    }
  }

  /**
   * Alarm handler for cleanup
   */
  async alarm(): Promise<void> {
    // Clean up old events (keep last 100)
    if (this.recentEvents.length > this.MAX_RECENT_EVENTS) {
      this.recentEvents = this.recentEvents.slice(-this.MAX_RECENT_EVENTS);
    }

    // Clean up dead connections
    const now = Date.now();
    const MAX_AGE = 3600000; // 1 hour
    for (const [id, conn] of this.connections.entries()) {
      if (now - conn.connectedAt > MAX_AGE) {
        console.log(`Cleaning up stale connection ${id}`);
        try {
          conn.webSocket.close(1000, 'Timeout');
        } catch {
          // Ignore errors
        }
        this.connections.delete(id);
      }
    }

    // Set next alarm
    await this.storage.setAlarm(Date.now() + 300000); // 5 minutes
  }
}
