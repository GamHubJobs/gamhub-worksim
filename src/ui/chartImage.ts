/**
 * A chart (ChartView's drawing) as a PNG picture, for apps that take pictures
 * (Word Craft). Needs a browser.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ChartSpec } from '../persistence/schemas'
import { ChartView } from './ChartView'

/** The chart drawn at twice 640 × 360, as a PNG data URL (white background). */
export async function chartPng(chart: ChartSpec): Promise<string> {
  const svg = renderToStaticMarkup(createElement(ChartView, { chart }))
    .replace(
      '<svg ',
      '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" ',
    )
    .replace('font-family:inherit', 'font-family:Arial, Helvetica, sans-serif')
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    // Loaded (not decode(), which can wait for ever under load), within a limit.
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(
        () => reject(new Error('the chart picture took too long to draw')),
        10_000,
      )
      image.onload = () => {
        window.clearTimeout(timer)
        resolve()
      }
      image.onerror = () => {
        window.clearTimeout(timer)
        reject(new Error('the chart picture could not be drawn'))
      }
      image.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 720
    const context = canvas.getContext('2d')!
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}
