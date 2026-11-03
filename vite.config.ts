import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import { serviceWorker } from './scripts/pwa/plugin.ts'

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as {
  version: string
}

// https://vite.dev/config/
export default defineConfig({
  // serviceWorker() writes dist/sw.js after a production build (offline support).
  plugins: [react(), tailwindcss(), serviceWorker()],
  // The 3D office and the PDF exports are loaded only when needed. Pre-bundle
  // their libraries when the dev server starts, so the first use does not
  // trigger a page reload.
  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@tiptap/react',
      '@tiptap/core',
      '@tiptap/starter-kit',
      '@tiptap/extension-table',
      '@tiptap/extension-text-align',
      '@tiptap/extension-text-style',
      '@tiptap/extensions',
      'jspdf',
      'jspdf-autotable',
      'fflate',
    ],
  },
  build: {
    // three.js makes the 3D office file large (about 250 kB compressed), but it
    // is only downloaded when the player enters the office.
    chunkSizeWarningLimit: 1000,
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  test: {
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
})
