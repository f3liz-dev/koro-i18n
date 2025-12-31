import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/**
 * Vite configuration for Vue frontend
 * 
 * This configuration builds the frontend for the Cloudflare Workers backend.
 * The built assets are served from the Workers static assets.
 */
export default defineConfig({
  plugins: [vue({
    vapor: true
  })],
  root: 'src/app',
  build: {
    outDir: '../../dist/frontend',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      input: {
        main: 'src/app/index.html',
        login: 'src/app/login.html',
        dashboard: 'src/app/dashboard.html',
        project: 'src/app/project.html',
        editor: 'src/app/editor.html'
      },
      output: {
        manualChunks(id: string) {
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
