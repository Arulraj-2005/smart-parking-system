import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  // This is the critical setting for GitHub Pages.
  // It tells Vite to prefix all asset URLs with your repository name.
  base: '/smart-parking-system/',
  plugins: [
    react(),
    tailwindcss(),
    // viteSingleFile() // <-- REMOVE this plugin for GitHub Pages
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // You can also keep the proxy for local development
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://smart-parking-api-zbno.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
});