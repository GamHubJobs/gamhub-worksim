/**
 * Draws a chart (column, bar, line or pie) as SVG. Used in Sheets, Docs and
 * Slides. The chart scales to its container; text stays readable because
 * sizes are in the chart's own units (it is drawn at 640 × 360 and scaled).
 */
import type { ChartSpec } from '../persistence/schemas'
import { CHART_COLORS, shortNumber } from './chartUtils'

const W = 640
const H = 360

/** A "nice" axis: 0 (or the minimum) to a round maximum, in 4–6 steps. */
function niceScale(min: number, max: number) {
  const low = Math.min(0, min)
  const high = Math.max(0, max)
  const span = high - low || 1
  const rough = span / 5
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? power
  const start = Math.floor(low / step) * step
  const end = Math.ceil(high / step) * step
  const ticks: number[] = []
  for (let v = start; v <= end + step / 2; v += step)
    ticks.push(Math.round(v * 1e6) / 1e6)
  return { start, end, ticks }
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export function ChartView({
  chart,
  className,
  textColor = '#334155',
  gridColor = '#e2e8f0',
}: {
  chart: ChartSpec
  className?: string
  textColor?: string
  gridColor?: string
}) {
  const hasData = chart.labels.length > 0 && chart.series.some((s) => s.values.length > 0)
  const legend = chart.type === 'pie' ? chart.labels : chart.series.map((s) => s.name)
  const titleSpace = chart.title ? 34 : 10
  const legendSpace = legend.length > 1 || chart.type === 'pie' ? 30 : 0

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label={`${chart.type} chart${chart.title ? `: ${chart.title}` : ''}`}
      data-testid="chart"
      style={{ fontFamily: 'inherit' }}
    >
      <rect width={W} height={H} fill="transparent" />
      {chart.title && (
        <text
          x={W / 2}
          y={24}
          textAnchor="middle"
          fontSize={18}
          fontWeight={600}
          fill={textColor}
        >
          {truncate(chart.title, 60)}
        </text>
      )}
      {!hasData ? (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={16} fill="#94a3b8">
          No numbers to chart yet
        </text>
      ) : chart.type === 'pie' ? (
        <Pie chart={chart} top={titleSpace} bottom={H - legendSpace} />
      ) : (
        <Axes
          chart={chart}
          top={titleSpace}
          bottom={H - legendSpace - 4}
          textColor={textColor}
          gridColor={gridColor}
        />
      )}
      {legendSpace > 0 && <Legend items={legend} y={H - 14} textColor={textColor} />}
    </svg>
  )
}

function Legend({
  items,
  y,
  textColor,
}: {
  items: string[]
  y: number
  textColor: string
}) {
  const shown = items.slice(0, 8)
  const width = Math.min(150, (W - 40) / shown.length)
  const startX = (W - width * shown.length) / 2
  return (
    <g>
      {shown.map((item, i) => (
        <g key={i} transform={`translate(${startX + i * width}, ${y})`}>
          <rect
            y={-9}
            width={11}
            height={11}
            rx={2}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
          />
          <text x={16} y={0} fontSize={12} fill={textColor}>
            {truncate(item, Math.floor(width / 8))}
          </text>
        </g>
      ))}
    </g>
  )
}

function Axes({
  chart,
  top,
  bottom,
  textColor,
  gridColor,
}: {
  chart: ChartSpec
  top: number
  bottom: number
  textColor: string
  gridColor: string
}) {
  const values = chart.series.flatMap((s) => s.values)
  const { start, end, ticks } = niceScale(Math.min(...values), Math.max(...values))
  const horizontal = chart.type === 'bar'
  const left = horizontal ? 120 : 60
  const right = W - 20
  const categories = chart.labels.length
  const scale = (v: number, from: number, to: number) =>
    from + ((v - start) / (end - start)) * (to - from)

  // Value axis runs up (column, line) or right (bar).
  const valuePos = (v: number) =>
    horizontal ? scale(v, left, right) : scale(v, bottom, top)
  const band = (horizontal ? bottom - top : right - left) / categories || 1
  const categoryPos = (i: number) => (horizontal ? top : left) + band * i + band / 2

  const series = chart.series.length
  const barThickness = Math.min(48, (band * 0.7) / series)

  return (
    <g fontSize={12} fill={textColor}>
      {ticks.map((tick) => {
        const p = valuePos(tick)
        return horizontal ? (
          <g key={tick}>
            <line x1={p} x2={p} y1={top} y2={bottom} stroke={gridColor} />
            <text x={p} y={bottom + 16} textAnchor="middle">
              {shortNumber(tick)}
            </text>
          </g>
        ) : (
          <g key={tick}>
            <line x1={left} x2={right} y1={p} y2={p} stroke={gridColor} />
            <text x={left - 8} y={p + 4} textAnchor="end">
              {shortNumber(tick)}
            </text>
          </g>
        )
      })}

      {chart.labels.map((label, i) => {
        const c = categoryPos(i)
        return horizontal ? (
          <text key={i} x={left - 8} y={c + 4} textAnchor="end">
            {truncate(label, 16)}
          </text>
        ) : (
          <text key={i} x={c} y={bottom + 16} textAnchor="middle">
            {truncate(label, Math.max(4, Math.floor(band / 7)))}
          </text>
        )
      })}

      {chart.type === 'line'
        ? chart.series.map((s, si) => {
            const color = CHART_COLORS[si % CHART_COLORS.length]
            const points = s.values
              .slice(0, categories)
              .map((v, i) => `${categoryPos(i)},${valuePos(v)}`)
            return (
              <g key={si}>
                <polyline
                  points={points.join(' ')}
                  fill="none"
                  stroke={color}
                  strokeWidth={3}
                  strokeLinejoin="round"
                />
                {s.values.slice(0, categories).map((v, i) => (
                  <circle
                    key={i}
                    cx={categoryPos(i)}
                    cy={valuePos(v)}
                    r={4}
                    fill={color}
                  />
                ))}
              </g>
            )
          })
        : chart.series.map((s, si) =>
            s.values.slice(0, categories).map((v, i) => {
              const color = CHART_COLORS[si % CHART_COLORS.length]
              const offset = (si - (series - 1) / 2) * barThickness
              const zero = valuePos(0)
              const p = valuePos(v)
              return horizontal ? (
                <rect
                  key={`${si}-${i}`}
                  x={Math.min(zero, p)}
                  y={categoryPos(i) + offset - barThickness / 2}
                  width={Math.abs(p - zero)}
                  height={barThickness * 0.92}
                  fill={color}
                  rx={2}
                />
              ) : (
                <rect
                  key={`${si}-${i}`}
                  x={categoryPos(i) + offset - barThickness / 2}
                  y={Math.min(zero, p)}
                  width={barThickness * 0.92}
                  height={Math.abs(p - zero)}
                  fill={color}
                  rx={2}
                />
              )
            }),
          )}

      {horizontal ? (
        <line x1={valuePos(0)} x2={valuePos(0)} y1={top} y2={bottom} stroke="#94a3b8" />
      ) : (
        <line x1={left} x2={right} y1={valuePos(0)} y2={valuePos(0)} stroke="#94a3b8" />
      )}
    </g>
  )
}

function Pie({ chart, top, bottom }: { chart: ChartSpec; top: number; bottom: number }) {
  const values = (chart.series[0]?.values ?? []).map((v) => Math.max(0, v))
  const total = values.reduce((sum, v) => sum + v, 0)
  const cx = W / 2
  const cy = (top + bottom) / 2
  const r = Math.max(20, (bottom - top) / 2 - 8)
  if (total <= 0) {
    return (
      <text x={cx} y={cy} textAnchor="middle" fontSize={16} fill="#94a3b8">
        No positive values to show
      </text>
    )
  }
  // Where each slice starts, going clockwise from the top.
  const starts = values.map(
    (_, i) =>
      -Math.PI / 2 +
      (values.slice(0, i).reduce((sum, v) => sum + v, 0) / total) * Math.PI * 2,
  )
  return (
    <g>
      {values.map((v, i) => {
        const slice = (v / total) * Math.PI * 2
        const start = starts[i]
        const end = start + slice
        const color = CHART_COLORS[i % CHART_COLORS.length]
        if (slice >= Math.PI * 2 - 1e-9) {
          return <circle key={i} cx={cx} cy={cy} r={r} fill={color} />
        }
        const large = slice > Math.PI ? 1 : 0
        const x1 = cx + r * Math.cos(start)
        const y1 = cy + r * Math.sin(start)
        const x2 = cx + r * Math.cos(end)
        const y2 = cy + r * Math.sin(end)
        const mid = (start + end) / 2
        const percent = Math.round((v / total) * 100)
        return (
          <g key={i}>
            <path
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
              fill={color}
              stroke="#ffffff"
              strokeWidth={2}
            />
            {percent >= 5 && (
              <text
                x={cx + r * 0.65 * Math.cos(mid)}
                y={cy + r * 0.65 * Math.sin(mid) + 5}
                textAnchor="middle"
                fontSize={14}
                fontWeight={600}
                fill="#ffffff"
              >
                {percent}%
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}
