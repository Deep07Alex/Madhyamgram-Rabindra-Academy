import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-ui': ['lucide-react', 'recharts'],
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  }
})
