/**
 * Adverts arrive as HTML from other websites. They are turned into plain text
 * here and shown as text: none of their markup, scripts or styles ever reaches
 * the page.
 */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  bull: '•',
  euro: '€',
  pound: '£',
  copy: '©',
  reg: '®',
  trade: '™',
  auml: 'ä',
  ouml: 'ö',
  uuml: 'ü',
  Auml: 'Ä',
  Ouml: 'Ö',
  Uuml: 'Ü',
  szlig: 'ß',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ccedil: 'ç',
}

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1] === 'x' || code[1] === 'X'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''
    }
    return ENTITIES[code] ?? whole
  })
}

/** HTML to plain text: paragraphs on their own lines, list items as bullets. */
export function htmlToText(html: string, maxLength = 6000): string {
  if (!html) return ''
  let s = html
    // What is never text.
    .replace(/<(script|style|noscript|iframe|svg|head)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Line breaks where the page would have them.
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|tr|table|section|article|blockquote)>/gi, '\n')
    .replace(/<(p|div|h[1-6]|ul|ol|tr|table|section|article|blockquote)[^>]*>/gi, '\n')
    // Every other tag goes.
    .replace(/<[^>]*>/g, '')
  s = decodeEntities(s)
    .replace(/\r/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (s.length > maxLength) {
    const cut = s.lastIndexOf(' ', maxLength)
    s = `${s.slice(0, cut > maxLength * 0.8 ? cut : maxLength)}…`
  }
  return s
}

/** One line of plain text (a title, a company name). */
export function oneLine(s: unknown, maxLength = 200): string {
  if (typeof s !== 'string') return ''
  const t = decodeEntities(s.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
  return t.length > maxLength ? `${t.slice(0, maxLength - 1)}…` : t
}

/** Only web addresses that open a page (never javascript: or data:). */
export function safeUrl(u: unknown): string | undefined {
  if (typeof u !== 'string') return undefined
  try {
    const url = new URL(u.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined
  } catch {
    return undefined
  }
}

/** Words for matching: lower case, accents kept, punctuation out. */
export function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#.]+/gu, ' ')
    .split(' ')
    .map((w) => w.replace(/^\.+|\.+$/g, ''))
    .filter(Boolean)
}
