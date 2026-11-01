/** Simple line icons (drawn here, so no icon library is needed). */
const PATHS = {
  mail: 'M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11Zm1 .5 8 6 8-6',
  tasks: 'M9 6h11M9 12h11M9 18h11M4 5.5l1 1 2-2M4 11.5l1 1 2-2M4 17.5l1 1 2-2',
  sheets: 'M4 4h16v16H4V4Zm0 5h16M4 14.5h16M9.5 4v16',
  career: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8L3.5 9.2l5.9-.9L12 3Z',
  back: 'M15 5l-7 7 7 7',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9h-13v-9Z',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  history: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4M12 8v4l3 2',
  file: 'M7 3h7l5 5v13H7V3Zm7 0v5h5',
  docs: 'M7 3h7l5 5v13H7V3Zm7 0v5h5M10 12h6M10 15h6M10 18h3',
  slides: 'M3 5h18v11H3V5Zm9 11v4m-4 0h8M7 9h6M7 12h9',
  chart: 'M4 4v16h16M8 16v-5M12 16V8M16 16v-3',
  present: 'M8 5.5v13l10-6.5-10-6.5Z',
  helpdesk:
    'M4 13v-1a8 8 0 0 1 16 0v1M4 13h3v6H5a1 1 0 0 1-1-1v-5Zm16 0h-3v6h2a1 1 0 0 0 1-1v-5ZM17 19c0 1.5-2 2.5-5 2.5',
  code: 'M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15',
  books: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm0 13a3 3 0 0 1 3-3h11M9 8h6M9 11h4',
  guide:
    'M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5Zm0 0v13',
  directory:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M16.5 4.5a3.2 3.2 0 0 1 0 6.2M18 14.5a5.5 5.5 0 0 1 3 5.5',
  network:
    'M12 3v4M12 17v4M4.5 12H8M16 12h3.5M10 7h4v3h-4V7Zm-6 7h4v3H4v-3Zm12 0h4v3h-4v-3Zm-6 3h4v3h-4v-3ZM6 14v-2h12v2M12 10v7',
  campaigns: 'M4 10v4h3l6 4V6L7 10H4Zm12-1a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  seo: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm4.6-1.9L20 20M8 10.5h5M10.5 8v5',
  social: 'M4 5h16v11H9l-5 4V5Zm4 4h8M8 12h5',
  analytics: 'M4 20h16M7 16v-5M11 16V8M15 16v-3M19 16V6',
  attach:
    'M16.5 9.5l-6 6a2.1 2.1 0 0 1-3-3l7-7a3.5 3.5 0 0 1 5 5l-7.5 7.5a5 5 0 0 1-7-7L11 5',
  print: 'M7 9V4h10v5M7 17H5v-6h14v6h-2M7 14h10v6H7v-6Z',
  close: 'M6 6l12 12M18 6L6 18',
  info: 'M12 8h.01M11 12h1v5h1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  send: 'M4 12l16-8-6 16-2.5-6.5L4 12Z',
  storage:
    'M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
} as const

export type IconName = keyof typeof PATHS

export function Icon({
  name,
  className = 'h-5 w-5',
}: {
  name: IconName
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
