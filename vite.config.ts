import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2015',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          excel: ['exceljs', 'xlsx'],
          azure: ['@azure/msal-browser', '@azure/msal-react']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'exceljs', 'xlsx']
  }
})

