import { defineConfig } from 'vite';
import { resolve } from 'path';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  root: 'src/app',
  publicDir: 'public',
  build: {
    outDir: '../../dist/frontend',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/app/index.html'),
      },
    },
    // Optimize bundle size for 2-second load time requirement
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    chunkSizeWarningLimit: 500,
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
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});