/**
 * Renders the app icons (PNG) from SVG with the browser Playwright provides.
 * Run once when the icon changes: node scripts/pwa/make-icons.mjs
 */
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'

// The same mark as the favicon: a white "W" on WorkSim blue. The maskable
// version keeps the letter inside the safe zone (the middle 80%).
const icon = (
  size,
  maskable,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="#1e3a8a"/>
  <text x="256" y="${maskable ? 318 : 340}" font-family="Segoe UI, Arial, sans-serif" font-size="${maskable ? 200 : 256}" font-weight="700" fill="#ffffff" text-anchor="middle">W</text>
</svg>`

writeFileSync('public/icons/icon.svg', icon(512, false))
const browser = await chromium.launch()
const page = await browser.newPage()
for (const [name, size, maskable] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${icon(size, maskable)}</body></html>`,
  )
  await page
    .locator('svg')
    .screenshot({ path: `public/icons/${name}`, omitBackground: true })
}
await browser.close()
console.log('icons written to public/icons')
