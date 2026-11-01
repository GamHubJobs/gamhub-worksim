import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { describe, expect, it } from 'vitest'
import {
  buildEmployabilityProfile,
  PROFILE_SECTIONS,
  type ProfileSettings,
} from '../game/employabilityProfile'
import type { PortfolioItem, Profile } from '../persistence/schemas'
import { profilePdf } from './pdf/profile'
import { profileBlocks, profileHtml } from './profile'

const profile = {
  id: 'p',
  name: 'Alex',
  careerId: 'accounting',
  levelId: 'accounts-assistant',
  assignments: {},
} as unknown as Profile

const item = {
  id: 'i1',
  profileId: 'p',
  title: 'Record the week’s transactions',
  summary: 'Journals for the week.',
  score: 92,
  completedAt: 1,
  levelTitle: 'Accounts Assistant',
  levelIndex: 1,
  skills: { bookkeeping: 30 },
  tools: ['sheets'],
  attempts: [{ submittedAt: 1, score: 92 }],
  included: true,
  featured: true,
  order: 0,
} as unknown as PortfolioItem

const settings: ProfileSettings = {
  displayName: 'Alex Morgan',
  headline: 'Aspiring accountant <b>',
  summary: 'I enjoy getting the numbers right & explaining them.',
  hidden: [],
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent()
    text += content.items.map((x) => ('str' in x ? x.str : '')).join(' ')
  }
  return text.replace(/\s+/g, ' ')
}

describe('profile exports', () => {
  it('the PDF has the player’s words, the generated sections and the statement', async () => {
    const built = buildEmployabilityProfile(settings, [profile], [item])
    const text = await pdfText(profilePdf(built))
    expect(text).toContain('Alex Morgan')
    expect(text).toContain('Aspiring accountant')
    expect(text).toContain('in the simulated Accounting career')
    expect(text).toContain('Record the week’s transactions (92%)')
    expect(text).toContain('It is not a record of employment')
  })

  it('hiding every section still keeps the honesty statement', () => {
    const built = buildEmployabilityProfile(
      { ...settings, hidden: PROFILE_SECTIONS.map((s) => s.id) },
      [profile],
      [item],
    )
    const blocks = profileBlocks(built)
    expect(blocks.some((b) => b.kind === 'heading' && b.text === 'Featured work')).toBe(
      false,
    )
    expect(blocks.at(-1)).toEqual({ kind: 'paragraph', text: built.honesty })
  })

  it('the web page escapes the player’s text', () => {
    const page = profileHtml(buildEmployabilityProfile(settings, [profile], [item]))
    expect(page).toContain('Aspiring accountant &lt;b&gt;')
    expect(page).toContain('numbers right &amp; explaining')
    expect(page).not.toContain('<b>')
  })
})
