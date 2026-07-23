import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Only generate the manifest — we have our own sw.js for push notifications
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Waplike - Dating App',
        short_name: 'Waplike',
        description: 'Find your perfect match with Waplike',
        theme_color: '#ec4899',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
})
