import { defineConfig } from 'vite';
import elmPlugin from 'vite-plugin-elm';

/**
 * Vite configuration for Elm frontend
 * 
 * This configuration builds the Elm frontend for the Cloudflare Workers backend.
 * The built assets are served from the Workers static assets.
 */
export default defineConfig({
  plugins: [elmPlugin()],
  root: 'src/app',
  build: {
    outDir: '../../dist/frontend',
    emptyOutDir: true,
    target: 'esnext',
    minify: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
});
