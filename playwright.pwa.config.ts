import { defineConfig, devices } from '@playwright/test'

// Tests of the installable, offline app. The service worker exists only in a
// production build, so these run against `vite preview` of a fresh build.
const PORT = 4181

export default defineConfig({
  testDir: 'tests/pwa',
  timeout: 120_000,
  // The service worker and its caches are shared by the whole origin: one at a time.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { VITE_CASE_SEED: '0' },
  },
})
