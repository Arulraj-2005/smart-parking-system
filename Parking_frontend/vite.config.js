import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // Prevent Vite from bundling server-only Node.js packages into the frontend build
  optimizeDeps: {
    exclude: ['razorpay', 'pg', 'bcryptjs', 'jsonwebtoken', 'express', 'cors', 'dotenv'],
  },
  build: {
    rollupOptions: {
      external: ['razorpay', 'crypto', 'pg', 'bcryptjs', 'jsonwebtoken', 'express', 'cors', 'dotenv'],
    },
  },
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
