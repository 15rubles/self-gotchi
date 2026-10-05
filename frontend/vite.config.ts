import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Override with API_TARGET=http://localhost:8081 to run against another backend.
const backend = process.env.API_TARGET ?? 'http://localhost:8080'
// changeOrigin stays false so Spring sees Host=localhost:5173 and its
// login/logout redirects land back on the Vite dev server.
const proxied = { target: backend, changeOrigin: false }

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Icons from pwa-assets.config.ts, injected into the manifest and index.html.
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'Self-Gotchi',
        short_name: 'Self-Gotchi',
        description: 'Habit tracker where your character reacts to what you do and skip.',
        theme_color: '#fde68a',
        background_color: '#fffbeb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2}'],
        // The SPA shell for app routes; the server's own pages and the API always hit the network.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/login/, /^\/logout/, /^\/error/],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': proxied,
      '/login': proxied,
      '/logout': proxied,
    },
  },
})
