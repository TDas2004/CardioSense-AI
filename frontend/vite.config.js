import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

try {
  const publicDir = path.resolve(__dirname, 'public')
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir)
  }
  fs.copyFileSync(
    path.resolve(__dirname, '../gcek.jpg'),
    path.resolve(__dirname, 'public/gcek.jpg')
  )
} catch (e) {
  console.error("Failed to copy gcek.jpg: ", e)
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
