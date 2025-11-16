import { describe, it, expect, vi } from 'vitest';
import { RustComputeWorker, createRustWorker } from './rust-worker-client';

describe('RustComputeWorker', () => {
  describe('batchHash', () => {
    it('should hash values using Rust worker', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          hashes: ['hash1', 'hash2', 'hash3'],
        }),
      });
      global.fetch = mockFetch;

      const worker = new RustComputeWorker('https://compute.example.com');
      const result = await worker.batchHash(['value1', 'value2', 'value3']);

      expect(result).toEqual(['hash1', 'hash2', 'hash3']);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://compute.example.com/hash',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should fall back to local computation on error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const worker = new RustComputeWorker('https://compute.example.com');
      const result = await worker.batchHash(['Hello']);

      // Should return array of hashes (fallback)
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(16); // 16 char hash
    });

    it('should throw error when fallback disabled', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const worker = new RustComputeWorker('https://compute.example.com', false);
      
      await expect(worker.batchHash(['value1'])).rejects.toThrow('Network error');
    });
  });

  describe('batchValidate', () => {
    it('should validate translations using Rust worker', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { id: 't1', is_valid: true },
            { id: 't2', is_valid: false, reason: 'Source value changed' },
          ],
        }),
      });
      global.fetch = mockFetch;

      const worker = new RustComputeWorker('https://compute.example.com');
      const result = await worker.batchValidate(
        [
          { id: 't1', key: 'key1', source_hash: 'hash1' },
          { id: 't2', key: 'key2', source_hash: 'hash2' },
        ],
        { key1: 'hash1', key2: 'hash3' }
      );

      expect(result).toHaveLength(2);
      expect(result[0].is_valid).toBe(true);
      expect(result[1].is_valid).toBe(false);
    });

    it('should fall back to local validation on error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const worker = new RustComputeWorker('https://compute.example.com');
      const result = await worker.batchValidate(
        [
          { id: 't1', key: 'key1', source_hash: 'hash1' },
          { id: 't2', key: 'key2', source_hash: 'hash2' },
        ],
        { key1: 'hash1', key2: 'hash3' }
      );

      // Should return validation results (fallback)
      expect(result).toHaveLength(2);
      expect(result[0].is_valid).toBe(true);
      expect(result[1].is_valid).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return true when worker is available', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
      });
      global.fetch = mockFetch;

      const worker = new RustComputeWorker('https://compute.example.com');
      const result = await worker.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when worker is unavailable', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const worker = new RustComputeWorker('https://compute.example.com');
      const result = await worker.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('createRustWorker', () => {
    it('should create worker when URL is provided', () => {
      const env = { COMPUTE_WORKER_URL: 'https://compute.example.com' };
      const worker = createRustWorker(env);

      expect(worker).toBeInstanceOf(RustComputeWorker);
    });

    it('should return null when URL is not provided', () => {
      const env = {};
      const worker = createRustWorker(env);

      expect(worker).toBeNull();
    });
  });
});
