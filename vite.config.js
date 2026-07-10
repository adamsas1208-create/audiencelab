import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // react-three-fiber ships its own reconciler; without forcing a single React
  // instance, Vite's dev graph can load two copies and every R3F hook throws
  // "Invalid hook call". Deduping pins one React across the app and R3F.
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
  },
  server: {
    watch: {
      // Poll the filesystem so HMR fires reliably even where native FS events
      // are missed (WSL, network/virtualized drives, some Windows setups).
      usePolling: true,
      interval: 100,
    },
    // Forward /api/* to the local dev API server (npm run api) so the app's
    // relative fetch('/api/duel') works in dev exactly like it will on Vercel.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
