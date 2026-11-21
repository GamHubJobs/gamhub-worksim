/** Space Studio's tool icons: simple line drawings, drawn here. */
const PATHS = {
  select: 'M5 3l12 9-5.5 1.2L14 19l-2.5 1.2-2.4-5.6L5 18V3Z',
  pan: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V12m0-6.5a1.5 1.5 0 0 1 3 0V12m0-4.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.5 14a1.5 1.5 0 0 1 2.5-1.6L8 15',
  wall: 'M3 7h18v4H3V7Zm0 6h18v4H3v-4Zm6-6v4m6-4v4m-9 2v4m6-4v4m6-4v4',
  room: 'M4 4h16v16H4V4Zm0 0 3 3m13-3-3 3M4 20l3-3m13 3-3-3',
  door: 'M5 21V4h9v17M5 21h14M11 12.5h.01M14 4a10 10 0 0 1 5 8.7',
  window: 'M4 4h16v16H4V4Zm8 0v16M4 12h16',
  pass: 'M5 21V8a7 7 0 0 1 14 0v13M3 21h18',
  stairs: 'M3 20h4v-4h4v-4h4V8h4V4h2',
  column: 'M8 3h8M8 21h8M9 3v18m6-18v18',
  balcony: 'M3 10h18M3 10v10h18V10M7 10v10m5-10v10m5-10v10M6 10V4h12v6',
  roof: 'M2 12 12 4l10 8M5 10v10h14V10',
  measure: 'M3 17 17 3l4 4L7 21l-4-4Zm4-4 2 2m1-5 2 2m1-5 2 2',
  dimension: 'M4 8v8m16-8v8M4 12h16M7 9l-3 3 3 3m10-6 3 3-3 3',
  label: 'M4 7V4h16v3M9 20h6M12 4v16',
  library: 'M4 12V9a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3M3 12h18v4H3v-4Zm2 4v3m14-3v3',
  layers: 'M12 3 2 8l10 5 10-5-10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'm15 14 5-5-5-5m5 5H10a6 6 0 0 0 0 12h3',
  zoomIn:
    'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM21 21l-5.6-5.6M10.5 7.5v6m-3-3h6',
  zoomOut: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM21 21l-5.6-5.6M7.5 10.5h6',
  fit: 'M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5',
  save: 'M5 3h11l4 4v14H4V3h1Zm3 0v5h7V3M7 21v-7h10v7',
  export: 'M12 3v12m0-12-4 4m4-4 4 4M4 15v5h16v-5',
  checks: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  plan: 'M3 3h18v18H3V3Zm0 10h7m4 0h7M12 3v7m0 5v6',
  cube: 'M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 0v20M3 7l9 5 9-5',
  walk: 'M13 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm-3 18 2-6 3 3v3m-5-14 4-1 3 4 3 1M10 8l-2 5 4 2',
  camera: 'M4 8h4l2-2h4l2 2h4v11H4V8Zm8 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  rotate: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  copy: 'M8 8h12v12H8V8Zm-4 8V4h12',
  bin: 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13',
  floors: 'M3 17h18M3 12h18M3 7h18',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-14v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM21 21l-5.6-5.6',
  grid: 'M3 3h18v18H3V3Zm0 6h18M3 15h18M9 3v18m6-18v18',
  magnet: 'M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3H6Zm0 4h4m4 0h4',
} as const

export type StudioIconName = keyof typeof PATHS

export function SIcon({
  name,
  className = 'h-4 w-4',
}: {
  name: StudioIconName
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
