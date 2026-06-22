import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // Poll the filesystem so HMR fires reliably even where native FS events
      // are missed (WSL, network/virtualized drives, some Windows setups).
      usePolling: true,
      interval: 100,
    },
  },
})
