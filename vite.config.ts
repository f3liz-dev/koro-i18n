import { defineConfig } from 'vite';
import { resolve } from 'path';
import elmPlugin from 'vite-plugin-elm';

export default defineConfig({
  plugins: [
    elmPlugin({
      debug: false,
      optimize: true,
    }),
  ],
  root: 'src/app',
  publicDir: resolve(__dirname, 'src/app/public'),
  build: {
    outDir: '../../dist/frontend',
    emptyOutDir: true,
    target: 'esnext',
    minify: true,
    rollupOptions: {
      output: {
        manualChunks: undefined, // Single bundle for static serving
      },
    },
  },
  resolve: { 
    alias: { 
      '@': resolve(__dirname, 'src')
    } 
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
  },
});