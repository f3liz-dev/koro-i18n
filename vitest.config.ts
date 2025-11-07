import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/app': resolve(__dirname, 'src/app'),
      '@/api': resolve(__dirname, 'src/api'),
      '@/lib': resolve(__dirname, 'src/lib'),
      '@/config': resolve(__dirname, 'src/config'),
    },
  },
});