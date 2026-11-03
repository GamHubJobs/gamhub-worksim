import { defineConfig, devices } from '@playwright/test'

// Cross-browser checks of the production build: the core journey in Firefox,
// WebKit (the engine behind Safari) and Microsoft Edge. Chromium is covered by
// the main suite (playwright.config.ts).
const PORT = 4182

export default defineConfig({
  testDir: 'tests/browsers',
  timeout: 180_000,
  workers: 2,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { VITE_CASE_SEED: '0' },
  },
})
