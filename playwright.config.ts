import { defineConfig, devices } from '@playwright/test'

// Browser tests: a robot uses the real app in Chromium.
// Uses its own port so it never clashes with your `npm run dev` on 5173.
const PORT = 5174

export default defineConfig({
  testDir: 'tests/e2e',
  // Tests run against the development server, where React is several times slower
  // than in the built app (extra debugging checks), and the 3D office is drawn
  // without a graphics card. Generous limits avoid false failures.
  // Activities are played out in 3D, so journeys through a day take a while.
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry absorbs the occasional overload on slower computers; tests that only
  // pass on the retry are still reported as "flaky".
  retries: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    // New saves get the original wording of every case, so tests can rely on it.
    env: { VITE_CASE_SEED: '0' },
  },
})
