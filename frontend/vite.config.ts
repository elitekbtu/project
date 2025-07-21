import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, } from 'node:url'
import { dirname, resolve as pathResolve } from 'node:path'
import { VitePWA } from 'vite-plugin-pwa'

const rootDir = dirname(fileURLToPath(import.meta.url as string))

export default defineConfig({
  plugins: [react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectManifest: {
        injectionPoint: undefined
      },
      devOptions: {
        enabled: false,
        type: 'module'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        sourcemap: true
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-avatar', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-switch', '@radix-ui/react-toast']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': pathResolve(rootDir, 'src'),
      '@app': pathResolve(rootDir, 'src/app'),
      '@entities': pathResolve(rootDir, 'src/entities'),
      '@features': pathResolve(rootDir, 'src/features'),
      '@shared': pathResolve(rootDir, 'src/shared'),
    },
  }
})
