import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, host: '0.0.0.0' },
  preview: { allowedHosts: true },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
  },
})
