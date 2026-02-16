import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'Venta.png', 'VentaWithoutBackground.png'],
      manifest: {
        name: 'Venta POS',
        short_name: 'Venta',
        description: 'Offline-capable Point of Sale System',
        theme_color: '#18181b', // Dark background
        background_color: '#18181b',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        icons: [
          {
            src: 'Venta.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'Venta.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'Venta.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
})
