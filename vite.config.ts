import { defineConfig } from 'vite';

/**
 * Vite configuration for vanilla JavaScript frontend
 * 
 * This configuration builds the frontend for the Cloudflare Workers backend.
 * The built assets are served from the Workers static assets.
 */
export default defineConfig({
  root: 'src/app',
  build: {
    outDir: '../../dist/frontend',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      input: {
        main: 'src/app/index.html'
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
});
