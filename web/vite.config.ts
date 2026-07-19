import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build-time <title> for index.html. Must match the default in
// src/config/branding.ts; per-client builds override via VITE_BRAND_NAME
// (multi-tenant plan §11).
const brandName = process.env.VITE_BRAND_NAME || 'Social Network'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-brand',
      transformIndexHtml: (html) => html.replace(/%BRAND_NAME%/g, brandName),
    },
  ],
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/billing': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
