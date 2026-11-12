/** A short, stable fingerprint of some text (not for security: cyrb53). */
export function fingerprintText(text: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

/**
 * A fingerprint of a value as JSON, whatever the order of its objects' keys
 * (saving checks content against its schema, which writes each object's keys
 * in the schema's order).
 */
export function fingerprintValue(value: unknown): string {
  return fingerprintText(
    JSON.stringify(value, (_key, part: unknown) =>
      part && typeof part === 'object' && !Array.isArray(part)
        ? Object.fromEntries(
            Object.entries(part).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
          )
        : part,
    ),
  )
}
