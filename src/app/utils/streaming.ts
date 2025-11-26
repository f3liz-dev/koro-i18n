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
    };
}

export interface ProgressEntry {
    type: 'file';
    filepath: string;
    keys: string[];
}

export async function* streamJsonl<T>(url: string): AsyncGenerator<T> {
    const response = await authFetch(url, { credentials: 'include' });
    if (!response.ok || !response.body) {
        throw new Error(`Failed to stream from ${url}`);
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
