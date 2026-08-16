import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/planner/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Smooth Transitions Planner',
        short_name: 'ST Planner',
        description: 'Move Plan Builder for Smooth Transitions senior moving services',
        theme_color: '#0F8271',
        background_color: '#f4f7f6',
        display: 'standalone',
        orientation: 'portrait',
        // Must match `base` — the app is served from /planner/, not the domain
        // root, so an installed icon launching at '/' would 404.
        start_url: '/planner/',
        scope: '/planner/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // woff2 included so the brand type is present offline, not just online.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // The PDF reader is only used when importing a PDF, and between the
        // library and its worker it is larger than the whole rest of the app.
        // Precaching it would triple what every install downloads to buy an
        // occasional feature, so it is fetched on demand and cached then.
        globIgnores: ['**/pdf-*.js', '**/pdf.worker*', '**/__vite-browser-external*'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(pdf-|pdf\.worker).*\.m?js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdf-reader',
              expiration: { maxEntries: 4 },
            },
          },
        ],
      }
    })
  ],
})
