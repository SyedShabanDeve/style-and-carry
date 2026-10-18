import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API's port in development. Set API_PORT if 4000 is taken by something else.
const api = `http://localhost:${process.env.API_PORT || 4000}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: true,
    proxy: {
      // Keeps the browser on one origin in development, so there is no CORS
      // in the way and the API calls look the same as they will in production.
      '/api': { target: api, changeOrigin: true },
      '/uploads': { target: api, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Split the vendor code so a copy change does not force shoppers to
        // re-download React on the next visit.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
        },
      },
    },
  },
});
