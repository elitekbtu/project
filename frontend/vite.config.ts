import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, } from 'node:url'
import { dirname, resolve as pathResolve } from 'node:path'

const rootDir = dirname(fileURLToPath(import.meta.url as string))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': pathResolve(rootDir, 'src'),
      '@app': pathResolve(rootDir, 'src/app'),
      '@entities': pathResolve(rootDir, 'src/entities'),
      '@features': pathResolve(rootDir, 'src/features'),
      '@shared': pathResolve(rootDir, 'src/shared'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 80,
  },
  preview: {
    host: '0.0.0.0',
    port: 80,
    allowedHosts: [
      'trc.works',
      'www.trc.works',
      'localhost',
      '127.0.0.1',
      '164.90.225.127'
    ]
  },
})
