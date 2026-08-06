import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/groceries/',
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../../../website/groceries'),
    emptyOutDir: true
  },
  server: {
    port: 3001, // Explicitly using a different port for Groceries
    strictPort: true, // Will fail if 3001 is already in use
    open: true // Automatically opens the browser
  }
})
