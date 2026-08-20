import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'pwa-icon.svg',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'apple-touch-icon.png'
      ],
      manifest: {
        id: '/',
        lang: 'pt-BR',
        dir: 'ltr',
        name: 'OmniFit - Dieta, Treino & Metabolismo',
        short_name: 'OmniFit',
        description: 'Nutrição de Precisão & Biomecânica Adaptativa',
        start_url: '/',
        scope: '/',
        theme_color: '#050811',
        background_color: '#050811',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}']
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        // Separa as bases de dados estáticas (TACO com 141 alimentos e 80
        // exercícios) e as bibliotecas em chunks próprios: num bundle único de
        // ~575 KB, tudo isso bloqueava a primeira renderização.
        manualChunks(id) {
          if (id.includes('src/core/data/')) return 'app-data';
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
          if (id.includes('node_modules/dexie')) return 'vendor-dexie';
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }
          return undefined;
        }
      }
    }
  }
})
