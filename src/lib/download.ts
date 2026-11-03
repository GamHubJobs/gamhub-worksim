/** Makes the browser download a file with the given name and contents. */
export function downloadFile(fileName: string, data: string | Uint8Array, type: string) {
  // A copy, so the bytes are in a plain ArrayBuffer as Blob expects.
  const part = typeof data === 'string' ? data : new Uint8Array(data)
  const url = URL.createObjectURL(new Blob([part], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before freeing the memory.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Makes the browser download a text file with the given name and contents. */
export function downloadTextFile(
  fileName: string,
  text: string,
  type = 'application/json',
) {
  downloadFile(fileName, text, type)
}

/** A file name made safe for every operating system, e.g. "Alex Morgan - portfolio". */
export function safeFileName(name: string): string {
  return (
    [...name]
      .map((ch) => (ch.charCodeAt(0) < 32 ? ' ' : ch))
      .join('')
      .replace(/[<>:"/\\|?*]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80)
      // Windows refuses names ending in a dot or space, and names such as CON or NUL.
      .replace(/[. ]+$/, '')
      .replace(/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i, '$1_$2') || 'file'
  )
}
