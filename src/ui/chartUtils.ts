/** Colours and number labels shared by every chart. */

export const CHART_COLORS = [
  '#2563eb',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#64748b',
  '#f97316',
  '#14b8a6',
  '#a855f7',
]

/** "1,250", "12.5k", "1.2M": short labels for axes. */
export function shortNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000)
    return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`
  if (abs >= 10_000) return `${(value / 1000).toFixed(abs >= 100_000 ? 0 : 1)}k`
  if (Number.isInteger(value)) return value.toLocaleString('en-US')
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
