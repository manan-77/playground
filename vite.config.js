import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // Proxy Yahoo Finance so the browser calls a same-origin path (no CORS).
    // The app fetches e.g. /yf/v8/finance/chart/AAPL and Vite forwards it.
    // NOTE: this proxy only exists in `vite dev` / `vite preview`, not in a
    // static production build — deploying would need a real proxy/serverless fn.
    proxy: {
      '/yf': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        rewrite: (p) => p.replace(/^\/yf/, ''),
      },
      // Python AI backend (FastAPI) — see backend/README.md.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
