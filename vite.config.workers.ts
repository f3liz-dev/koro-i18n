import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  plugins: [
    cloudflare({
      // Cloudflare Workers configuration
      persist: {
        // Enable persistence for local development
        path: '.wrangler/state'
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src',
      '@/app': '/src/app',
      '@/api': '/src/api',
      '@/lib': '/src/lib',
      '@/config': '/src/config'
    }
  },
  define: {
    // Define globals for Workers environment
    global: 'globalThis'
  },
  // Workers-specific optimizations
  optimizeDeps: {
    exclude: [
      '@cloudflare/workers-types'
    ]
  },
  // Enable source maps for debugging
  esbuild: {
    keepNames: true,
    sourcemap: true
  }
});