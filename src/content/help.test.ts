import { describe, expect, it } from 'vitest'
import { HELP_TOPICS } from './help'

describe('the in-app help', () => {
  it('answers every question a new player has', () => {
    const all = HELP_TOPICS.map((t) => `${t.title} ${t.text.join(' ')}`)
      .join(' ')
      .toLowerCase()
    for (const subject of [
      'simulation',
      'not',
      'qualification',
      'office',
      'places',
      'tasks',
      'cases',
      'readiness',
      'xp',
      'promot',
      'portfolio',
      'export',
      'backup',
      'safety copy',
      'install',
      'offline',
      'keyboard',
      'repair app files',
      'this device',
    ])
      expect(all, subject).toContain(subject)
  })

  it('has unique topics, each with something to say', () => {
    expect(new Set(HELP_TOPICS.map((t) => t.id)).size).toBe(HELP_TOPICS.length)
    for (const topic of HELP_TOPICS) expect(topic.text.length).toBeGreaterThan(0)
  })
})
