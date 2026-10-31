/**
 * Draws one slide at any size: the same component is used for thumbnails,
 * the editing canvas and presentation mode, so they always look the same.
 * Slides are laid out in 960 × 540 units and scaled to the given width.
 */
import type { ReactNode } from 'react'
import {
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  type Slide,
  type SlideElement,
  type SlideTheme,
} from '../../persistence/schemas'
import { ChartView } from '../../ui/ChartView'
import { boxStyle, PLACEHOLDERS, slideBackground, slideTextColor, THEMES } from './model'

interface SlideViewProps {
  slide: Slide
  theme: SlideTheme
  /** Width in pixels; the height follows (16:9). */
  width: number
  /** Show "Click to add a title" in empty boxes (while editing). */
  placeholders?: boolean
  /** The element being edited as text is drawn by the editor instead. */
  hiddenElementId?: string | null
  /** Drawn on top, in slide units (selection handles, editors). */
  children?: ReactNode
}

export function SlideView({
  slide,
  theme: themeId,
  width,
  placeholders = false,
  hiddenElementId = null,
  children,
}: SlideViewProps) {
  const theme = THEMES[themeId]
  const scale = width / SLIDE_WIDTH
  return (
    <div
      className="relative overflow-hidden"
      style={{ width, height: width * (SLIDE_HEIGHT / SLIDE_WIDTH) }}
      data-testid="slide"
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${scale})`,
          background: slideBackground(slide, theme),
          color: slideTextColor(slide, theme),
        }}
      >
        {/* A thin accent bar gives content slides a finished look. */}
        {slide.layout !== 'title' &&
          slide.layout !== 'section' &&
          slide.layout !== 'blank' && (
            <div
              className="absolute top-0 left-0 h-2 w-full"
              style={{ background: theme.accent }}
              aria-hidden
            />
          )}
        {slide.elements.map((element) =>
          element.id === hiddenElementId ? null : (
            <ElementView
              key={element.id}
              element={element}
              accent={theme.accent}
              muted={theme.muted}
              textColor={slideTextColor(slide, theme)}
              placeholders={placeholders}
            />
          ),
        )}
        {children}
      </div>
    </div>
  )
}

function ElementView({
  element,
  accent,
  muted,
  textColor,
  placeholders,
}: {
  element: SlideElement
  accent: string
  muted: string
  textColor: string
  placeholders: boolean
}) {
  const style = boxStyle(element)
  switch (element.type) {
    case 'text': {
      const empty = element.text.trim() === ''
      if (empty && !placeholders) return null
      return (
        <div
          data-element-id={element.id}
          style={{
            ...style,
            color: empty ? muted : (element.style.color ?? textColor),
            fontSize: element.style.size,
            fontWeight: element.style.bold ? 700 : 400,
            fontStyle: element.style.italic ? 'italic' : 'normal',
            textAlign: element.style.align,
            lineHeight: 1.25,
            overflow: 'hidden',
            outline: empty ? `2px dashed ${muted}55` : undefined,
          }}
        >
          {empty ? (
            <span>{PLACEHOLDERS[element.role ?? 'body']}</span>
          ) : (
            <TextLines
              text={element.text}
              bullets={element.style.bullets}
              accent={accent}
            />
          )}
        </div>
      )
    }
    case 'shape':
      return (
        <div data-element-id={element.id} style={style}>
          <ShapeView element={element} accent={accent} />
        </div>
      )
    case 'image':
      return (
        <img
          data-element-id={element.id}
          src={element.src}
          alt={element.alt}
          draggable={false}
          style={{ ...style, objectFit: 'contain' }}
        />
      )
    case 'chart':
      return (
        <div data-element-id={element.id} style={style}>
          <ChartView
            chart={element.chart}
            className="h-full w-full"
            textColor={textColor}
            gridColor={`${muted}55`}
          />
        </div>
      )
  }
}

export function TextLines({
  text,
  bullets,
  accent,
}: {
  text: string
  bullets: boolean
  accent: string
}) {
  const lines = text.split('\n')
  if (!bullets) {
    return (
      <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
        {lines.map((line, i) => (
          <div key={i}>{line || ' '}</div>
        ))}
      </div>
    )
  }
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {lines.map((line, i) => (
        <li key={i} style={{ display: 'flex', gap: '0.5em', marginBottom: '0.35em' }}>
          {line.trim() !== '' && <span style={{ color: accent }}>•</span>}
          <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
            {line || ' '}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ShapeView({
  element,
  accent,
}: {
  element: Extract<SlideElement, { type: 'shape' }>
  accent: string
}) {
  const fill = element.fill ?? accent
  const stroke = element.stroke ?? 'none'
  const { w, h } = element
  const shape = (() => {
    switch (element.shape) {
      case 'rect':
        return (
          <rect
            x={1}
            y={1}
            width={w - 2}
            height={h - 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={2}
          />
        )
      case 'rounded':
        return (
          <rect
            x={1}
            y={1}
            width={w - 2}
            height={h - 2}
            rx={Math.min(w, h) / 6}
            fill={fill}
            stroke={stroke}
            strokeWidth={2}
          />
        )
      case 'ellipse':
        return (
          <ellipse
            cx={w / 2}
            cy={h / 2}
            rx={w / 2 - 1}
            ry={h / 2 - 1}
            fill={fill}
            stroke={stroke}
            strokeWidth={2}
          />
        )
      case 'arrow': {
        const head = Math.min(h, w / 3)
        return (
          <polygon
            points={`0,${h * 0.3} ${w - head},${h * 0.3} ${w - head},0 ${w},${h / 2} ${w - head},${h} ${w - head},${h * 0.7} 0,${h * 0.7}`}
            fill={fill}
            stroke={stroke}
            strokeWidth={2}
          />
        )
      }
      case 'line':
        return (
          <line
            x1={0}
            y1={h / 2}
            x2={w}
            y2={h / 2}
            stroke={element.fill ?? accent}
            strokeWidth={4}
          />
        )
    }
  })()
  return (
    <div className="relative h-full w-full">
      <svg width={w} height={h} className="absolute inset-0 overflow-visible" aria-hidden>
        {shape}
      </svg>
      {element.text && element.shape !== 'line' && (
        <div
          className="absolute inset-0 flex items-center justify-center p-2 text-center"
          style={{ color: '#ffffff', fontSize: 20, fontWeight: 600 }}
        >
          {element.text}
        </div>
      )}
    </div>
  )
}
