import { afterEach, describe, expect, it } from 'vitest'
import { createId } from '../../lib/ids'
import { exportBackup, importBackup, readBackupFile } from '../../persistence/backup'
import { WorkSimDatabase } from '../../persistence/db'
import { createDocument, getDocument } from '../../persistence/documentsRepo'
import { DocContentSchema } from '../../persistence/schemas'
import { createVersion, listVersions } from '../../persistence/versions'
import { describeContent } from '../../ui/documentSummary'
import { bullets, docContent, h, p, table } from './templates'
import { DOC_TEMPLATES } from './templates'
import { countWords, findNodes, outline, plainText } from './text'

const databases: WorkSimDatabase[] = []
afterEach(async () => {
  for (const database of databases.splice(0)) await database.delete()
})

describe('reading documents', () => {
  const content = docContent([
    h(1, 'Monthly report'),
    p('Spending was within budget.'),
    h(2, 'Findings'),
    bullets(['Travel was over', 'Software was under']),
    table([
      ['Category', 'Actual'],
      ['Travel', '1,866'],
    ]),
  ])

  it('reads the text, counts words and finds the headings', () => {
    expect(plainText(content.body)).toContain('Spending was within budget.')
    expect(plainText(content.body)).toContain('Travel\n1,866')
    expect(countWords(content.body)).toBe(17)
    expect(outline(content.body)).toEqual([
      { level: 1, text: 'Monthly report', index: 0 },
      { level: 2, text: 'Findings', index: 2 },
    ])
    expect(findNodes(content.body, 'table')).toHaveLength(1)
  })

  it('describes documents for file lists and version history', () => {
    const document = {
      kind: 'doc' as const,
      content,
    } as Parameters<typeof describeContent>[0]
    expect(describeContent(document)).toBe('17 words')
  })
})

describe('templates', () => {
  it.each(DOC_TEMPLATES.map((t) => [t.id, t] as const))(
    '%s is a valid document',
    (_, template) => {
      const built = template.build('Alex Morgan')
      expect(DocContentSchema.safeParse(built).success).toBe(true)
      if (template.id !== 'blank') expect(plainText(built.body)).toContain('Alex Morgan')
    },
  )
})

describe('saving documents', () => {
  it('keeps documents and their versions in backups', async () => {
    const source = new WorkSimDatabase(`test-${createId()}`)
    const target = new WorkSimDatabase(`test-${createId()}`)
    databases.push(source, target)
    const report = await createDocument(
      { kind: 'doc', title: 'Report', content: DOC_TEMPLATES[1].build('Alex') },
      source,
    )
    await createVersion(report, 'manual', { keep: true }, source)

    const preview = await readBackupFile((await exportBackup(source)).text)
    expect(preview.documentTitles).toEqual(['Report'])
    await importBackup(preview, target)
    expect(await getDocument(report.id, target)).toEqual(report)
    expect(await listVersions(report.id, target)).toHaveLength(1)
  })
})
