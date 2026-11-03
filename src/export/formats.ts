/**
 * Writing blocks and tables in open formats: CSV (opens in any spreadsheet),
 * Markdown and HTML (open in any editor or browser). Pure functions.
 */
import type { Block, ExportTable } from './blocks'

/**
 * Text that a spreadsheet program would run as a formula (=, +, @, or - before
 * something that is not a number) is marked as text with a leading apostrophe,
 * so opening an export can never run anything. Numbers are left alone.
 */
export function neutraliseFormula(value: string): string {
  const looksNumeric = /^-?[\d.,]+%?$/.test(value)
  return /^[=+@\t\r]/.test(value) || (value.startsWith('-') && !looksNumeric)
    ? `'${value}`
    : value
}

/** A CSV field, made safe to open and quoted when needed (RFC 4180). */
function csvField(raw: string): string {
  const value = neutraliseFormula(raw)
  return /[",\r\n]/.test(value) || /^\s|\s$/.test(value)
    ? `"${value.replace(/"/g, '""')}"`
    : value
}

/**
 * A table as CSV. Starts with a byte-order mark so spreadsheet apps read
 * accented letters and symbols such as £ correctly.
 */
export function toCsv(table: Pick<ExportTable, 'head' | 'rows'>): string {
  const lines = [...(table.head.length > 0 ? [table.head] : []), ...table.rows].map(
    (row) => row.map(csvField).join(','),
  )
  return `﻿${lines.join('\r\n')}\r\n`
}

/** Reads CSV written by `toCsv` (used by tests to prove the round trip). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const input = text.replace(/^﻿/, '')
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

const mdCell = (text: string) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ')

function markdownTable(table: ExportTable): string {
  const width = Math.max(table.head.length, ...table.rows.map((r) => r.length), 1)
  const pad = (row: string[]) => Array.from({ length: width }, (_, i) => row[i] ?? '')
  const head = table.head.length > 0 ? table.head : pad([])
  return [
    `| ${pad(head).map(mdCell).join(' | ')} |`,
    `| ${pad([])
      .map(() => '---')
      .join(' | ')} |`,
    ...table.rows.map((row) => `| ${pad(row).map(mdCell).join(' | ')} |`),
  ].join('\n')
}

export function toMarkdown(title: string, blocks: Block[]): string {
  const parts = [`# ${title}`]
  for (const block of blocks) {
    switch (block.kind) {
      case 'heading':
        parts.push(`${'#'.repeat(block.level + 1)} ${block.text}`)
        break
      case 'paragraph':
        parts.push(block.text)
        break
      case 'list':
        parts.push(
          block.items
            .map((item, i) => `${block.ordered ? `${i + 1}.` : '-'} ${item}`)
            .join('\n'),
        )
        break
      case 'table':
        parts.push(
          `${block.table.title ? `**${block.table.title}**\n\n` : ''}${markdownTable(block.table)}`,
        )
        break
      case 'chart':
        parts.push(
          `**Chart: ${block.chart.title || 'untitled'}** (${block.chart.type})\n\n${markdownTable(
            {
              title: '',
              head: ['', ...block.chart.series.map((s) => s.name)],
              rows: block.chart.labels.map((label, i) => [
                label,
                ...block.chart.series.map((s) => String(s.values[i] ?? '')),
              ]),
            },
          )}`,
        )
        break
      case 'code':
        parts.push(`**${block.title}**\n\n\`\`\`\n${block.text}\n\`\`\``)
        break
    }
  }
  return `${parts.join('\n\n')}\n`
}

const html = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function htmlTable(table: ExportTable): string {
  const head =
    table.head.length > 0
      ? `<thead><tr>${table.head.map((h) => `<th>${html(h)}</th>`).join('')}</tr></thead>`
      : ''
  const body = table.rows
    .map((row) => `<tr>${row.map((c) => `<td>${html(c)}</td>`).join('')}</tr>`)
    .join('\n')
  return `<table>${table.title ? `<caption>${html(table.title)}</caption>` : ''}${head}<tbody>\n${body}\n</tbody></table>`
}

/** A complete, self-contained HTML page (no scripts, no outside files). */
export function toHtml(title: string, blocks: Block[], footer: string): string {
  const parts: string[] = []
  for (const block of blocks) {
    switch (block.kind) {
      case 'heading':
        parts.push(`<h${block.level + 1}>${html(block.text)}</h${block.level + 1}>`)
        break
      case 'paragraph':
        parts.push(`<p>${html(block.text)}</p>`)
        break
      case 'list': {
        const tag = block.ordered ? 'ol' : 'ul'
        parts.push(
          `<${tag}>${block.items.map((i) => `<li>${html(i)}</li>`).join('')}</${tag}>`,
        )
        break
      }
      case 'table':
        parts.push(htmlTable(block.table))
        break
      case 'chart':
        parts.push(
          htmlTable({
            title: `Chart: ${block.chart.title || 'untitled'}`,
            head: ['', ...block.chart.series.map((s) => s.name)],
            rows: block.chart.labels.map((label, i) => [
              label,
              ...block.chart.series.map((s) => String(s.values[i] ?? '')),
            ]),
          }),
        )
        break
      case 'code':
        parts.push(
          `<h4>${html(block.title)}</h4><pre><code>${html(block.text)}</code></pre>`,
        )
        break
    }
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${html(title)}</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 52rem; margin: 2rem auto; padding: 0 1rem; color: #1e293b; line-height: 1.5; }
table { border-collapse: collapse; margin: 1rem 0; }
th, td { border: 1px solid #cbd5e1; padding: 0.25rem 0.5rem; text-align: left; }
th { background: #f1f5f9; }
caption { text-align: left; font-weight: 600; }
pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.75rem; overflow-x: auto; }
footer { margin-top: 3rem; color: #64748b; font-size: 0.85rem; }
</style>
</head>
<body>
<h1>${html(title)}</h1>
${parts.join('\n')}
<footer>${html(footer)}</footer>
</body>
</html>
`
}
