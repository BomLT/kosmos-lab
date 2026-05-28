import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/kosmos-lab/',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 3000,
  }
})