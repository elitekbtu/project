// Service Worker Registration with error handling and fallback
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Try to register the main Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js', { 
        scope: '/',
        updateViaCache: 'none'
      })
      
      console.log('Service Worker registered successfully:', registration)
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available
              console.log('New content is available')
            }
          })
        }
      })
      
    } catch (error) {
      console.error('Main Service Worker registration failed:', error)
      
      // Try fallback Service Worker
      try {
        const fallbackRegistration = await navigator.serviceWorker.register('/sw-fallback.js', { 
          scope: '/',
          updateViaCache: 'none'
        })
        console.log('Fallback Service Worker registered successfully:', fallbackRegistration)
      } catch (fallbackError) {
        console.error('Fallback Service Worker registration also failed:', fallbackError)
      }
    }
  })
} 