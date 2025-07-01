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
})
