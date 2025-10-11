import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2015',
    minify: 'terser',
    cssCodeSplit: true,
    sourcemap: false,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          excel: ['exceljs', 'xlsx'],
          azure: ['@azure/msal-browser', '@azure/msal-react'],
          window: ['react-window']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'exceljs', 'xlsx', 'react-window']
  }
})

