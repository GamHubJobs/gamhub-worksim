/**
 * Storing the portfolio: items (light, for lists) and frozen file copies
 * (heavy, loaded when an item is opened). Evidence is written only through
 * `applyCapture`, inside the same transaction that saves the grade (or by the
 * backfill); the player can change only the presentation fields.
 */
import { type CaptureDecision, documentBytes } from '../game/portfolio'
import { createId } from '../lib/ids'
import { db as defaultDb, getDeviceId, recordChange, type WorkSimDatabase } from './db'
import {
  PortfolioFileSchema,
  PortfolioItemSchema,
  type PortfolioFile,
  type PortfolioItem,
} from './schemas'

export async function findPortfolioItem(
  key: string,
  database: WorkSimDatabase = defaultDb,
): Promise<PortfolioItem | undefined> {
  const item = await database.portfolioItems.where('key').equals(key).first()
  return item && !item.deleted ? item : undefined
}

/**
 * Applies a capture decision. Must run inside a transaction that includes the
 * portfolio tables, the meta table and the outbox.
 */
export async function applyCapture(
  decision: CaptureDecision,
  existing: PortfolioItem | undefined,
  database: WorkSimDatabase,
  /** Marks files the backfill could not find (none, for live submissions). */
  missing: ReadonlySet<number> = new Set(),
): Promise<PortfolioItem | undefined> {
  if (decision.action === 'none') return existing
  const deviceId = await getDeviceId(database)
  const now = Date.now()
  const stamp = (previous?: { rev: number; updatedAt: number; createdAt: number }) => ({
    createdAt: previous?.createdAt ?? now,
    updatedAt: previous ? Math.max(now, previous.updatedAt + 1) : now,
    rev: (previous?.rev ?? 0) + 1,
    deviceId,
    deleted: false,
  })

  if (decision.action === 'history') {
    if (!existing) return undefined
    const item = PortfolioItemSchema.parse({
      ...existing,
      ...stamp(existing),
      attempts: decision.attempts,
    })
    await database.portfolioItems.put(item)
    await recordChange(database, 'portfolioItems', item)
    return item
  }

  // New or better evidence: replace the file copies.
  if (existing)
    await database.portfolioFiles.bulkDelete(existing.files.map((f) => f.fileId))
  const itemId = existing?.id ?? createId()
  const files: PortfolioItem['files'] = []
  for (const [index, { role, document }] of decision.files.entries()) {
    const fileId = createId()
    const available = !missing.has(index)
    files.push({
      fileId,
      role,
      kind: document.kind,
      ...(document.kind === 'tool' ? { toolId: document.content.tool } : {}),
      title: document.title,
      bytes: available ? documentBytes(document) : 0,
      available,
    })
    if (!available) continue
    const file = PortfolioFileSchema.parse({
      id: fileId,
      itemId,
      ...stamp(),
      snapshot: document,
    })
    await database.portfolioFiles.put(file)
    await recordChange(database, 'portfolioFiles', file)
  }
  const item = PortfolioItemSchema.parse({
    ...decision.evidence,
    id: itemId,
    ...stamp(existing),
    files,
    included: existing?.included ?? true,
    featured: existing?.featured ?? false,
    note: existing?.note ?? '',
    order: existing?.order ?? 0,
  })
  await database.portfolioItems.put(item)
  await recordChange(database, 'portfolioItems', item)
  return item
}

/** Every item, newest first (optionally for some career saves only). */
export async function listPortfolioItems(
  profileIds?: string[],
  database: WorkSimDatabase = defaultDb,
): Promise<PortfolioItem[]> {
  const items = profileIds
    ? await database.portfolioItems.where('profileId').anyOf(profileIds).toArray()
    : await database.portfolioItems.toArray()
  return items.filter((i) => !i.deleted).sort((a, b) => b.completedAt - a.completedAt)
}

export async function loadPortfolioFiles(
  item: PortfolioItem,
  database: WorkSimDatabase = defaultDb,
): Promise<PortfolioFile[]> {
  const rows = await database.portfolioFiles.where('itemId').equals(item.id).toArray()
  const order = new Map(item.files.map((f, i) => [f.fileId, i]))
  return rows
    .filter((r) => !r.deleted && order.has(r.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
}

export type PresentationChange = Partial<
  Pick<PortfolioItem, 'included' | 'featured' | 'note' | 'order'>
>

/** Changes how an item is presented. Evidence fields can't be changed here. */
export async function updatePortfolioPresentation(
  itemId: string,
  change: PresentationChange,
  database: WorkSimDatabase = defaultDb,
): Promise<PortfolioItem> {
  const allowed: PresentationChange = {}
  if (change.included !== undefined) allowed.included = change.included
  if (change.featured !== undefined) allowed.featured = change.featured
  if (change.note !== undefined) allowed.note = change.note.slice(0, 600)
  if (change.order !== undefined) allowed.order = change.order
  return database.transaction(
    'rw',
    [database.meta, database.portfolioItems, database.outbox],
    async () => {
      const current = await database.portfolioItems.get(itemId)
      if (!current || current.deleted)
        throw new Error('That portfolio item no longer exists.')
      const deviceId = await getDeviceId(database)
      const item = PortfolioItemSchema.parse({
        ...current,
        ...allowed,
        rev: current.rev + 1,
        updatedAt: Math.max(Date.now(), current.updatedAt + 1),
        deviceId,
      })
      await database.portfolioItems.put(item)
      await recordChange(database, 'portfolioItems', item)
      return item
    },
  )
}
