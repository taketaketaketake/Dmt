import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build-time branding for index.html. brandName must match the default in
// src/config/branding.ts; per-client builds override via VITE_BRAND_NAME /
// VITE_FAVICON_URL (multi-tenant plan §11).
const brandName = process.env.VITE_BRAND_NAME || 'Social Network'
const faviconUrl = process.env.VITE_FAVICON_URL || '/vite.svg'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-brand',
      transformIndexHtml: (html) =>
        html
          .replace(/%BRAND_NAME%/g, brandName)
          .replace(/%FAVICON_URL%/g, faviconUrl),
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
