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
        theme_color: '#4f46e5',
        background_color: '#f5f5f5',
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
})
