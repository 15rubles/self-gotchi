import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backend = 'http://localhost:8080'
// changeOrigin stays false so Spring sees Host=localhost:5173 and its
// login/logout redirects land back on the Vite dev server.
const proxied = { target: backend, changeOrigin: false }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': proxied,
      '/login': proxied,
      '/logout': proxied,
    },
  },
})
