import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Production-focused build tuning
  esbuild: {
    // strip console/debugger in production builds to reduce bundle size
    drop: ['console', 'debugger']
  },
  build: {
    sourcemap: false,
    target: 'es2019',
    cssCodeSplit: true,
    minify: 'esbuild',
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          supabase: ['@supabase/supabase-js'],
          markdown: ['react-markdown', 'remark-gfm', 'rehype-raw'],
          syntax: ['react-syntax-highlighter'],
          icons: ['lucide-react']
        }
      }
    }
  },
  server: {
    proxy: {
      '/api/nvd': {
        target: 'https://services.nvd.nist.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nvd/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ThreatIntel/1.0)'
        }
      }
    }
  }
});