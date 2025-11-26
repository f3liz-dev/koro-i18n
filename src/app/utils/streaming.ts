import { authFetch } from './authFetch';

export interface ManifestEntry {
    type: 'header' | 'file';
    repository?: string;
    sourceLanguage?: string;
    configVersion?: number;
    totalFiles?: number;
    entry?: {
        filename: string;
        sourceFilename: string;
        lastUpdated: string;
        commitHash: string;
        language: string;
        totalKeys?: number;
    };
}

export interface ProgressEntry {
    type: 'file';
    filepath: string;
    keys: string[];
}

export async function* streamJsonl<T>(url: string, init?: RequestInit & { ignoreNotFound?: boolean }): AsyncGenerator<T> {
    const response = await authFetch(url, { credentials: 'include', ...(init || {}) });
    if (!response.ok) {
        // If the caller asked us to ignore 404s, simply exit the generator quietly.
        if (response.status === 404 && (init as any)?.ignoreNotFound) {
            return;
        }
        // Try to extract useful error information from the JSON error body
        const contentType = response.headers.get('Content-Type') || '';
        let message = `HTTP ${response.status}`;
        try {
            if (contentType.includes('application/json')) {
                const body = await response.clone().json();
                const jsonBody = body as any;
                if (jsonBody && typeof jsonBody === 'object') {
                    if (jsonBody.error) message += ` - ${jsonBody.error}`;
                    else if (jsonBody.message) message += ` - ${jsonBody.message}`;
                }
            } else {
                const text = await response.clone().text();
                if (text) message += ` - ${text}`;
            }
        } catch (e) {
            // Ignore parse errors and use generic message
        }
        throw new Error(`Failed to stream from ${url}: ${message}`);
    }

    if (!response.body) {
        throw new Error(`Failed to stream from ${url}: no response body`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.trim()) {
                try {
                    yield JSON.parse(line) as T;
                } catch (e) {
                    console.warn('Failed to parse JSONL line:', line);
                }
            }
        }
    }

    if (buffer.trim()) {
        try {
            yield JSON.parse(buffer) as T;
        } catch (e) {
            console.warn('Failed to parse JSONL line:', buffer);
        }
    }
}
