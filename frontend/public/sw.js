import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()

// Add proper error handling for manifest
if (self.__WB_MANIFEST && Array.isArray(self.__WB_MANIFEST)) {
  precacheAndRoute(self.__WB_MANIFEST)
} else {
  // Fallback: precache basic resources
  precacheAndRoute([
    { url: '/', revision: '1' },
    { url: '/index.html', revision: '1' }
  ])
}

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') self.skipWaiting()
}) 