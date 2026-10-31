/**
 * Upgrades saved documents from older content formats to the current one.
 *
 * Every document stores a `formatVersion`. When we change how a document kind
 * stores its content, we raise its number in `DOCUMENT_FORMAT_VERSIONS` and add
 * an upgrade step here. Old saves and old backups are then upgraded
 * automatically when they are loaded.
 */
import { NewerFormatError } from './errors'
import { DOCUMENT_FORMAT_VERSIONS } from './schemas'

type RawDocument = Record<string, unknown>

/** Upgrades a document from format `n` to format `n + 1`. */
export type DocumentUpgradeStep = (document: RawDocument) => RawDocument

/** For each document kind: the upgrade step that starts from each format version. */
export type DocumentMigrations = Record<string, Record<number, DocumentUpgradeStep>>

export const DOCUMENT_MIGRATIONS: DocumentMigrations = {
  sheet: {
    // Format 2 added optional cell formatting and column widths. Format 1
    // content is already valid format 2 content. The version was raised so
    // that an older app refuses workbooks with formatting instead of
    // silently dropping it.
    1: (doc) => doc,
  },
}

/**
 * Returns the document upgraded to the current format version.
 * Data that is not a recognisable document is returned unchanged, so that
 * schema validation can reject it with a clear message.
 */
export function upgradeDocument(
  raw: unknown,
  targetVersions: Record<string, number> = DOCUMENT_FORMAT_VERSIONS,
  migrations: DocumentMigrations = DOCUMENT_MIGRATIONS,
): unknown {
  if (typeof raw !== 'object' || raw === null) return raw
  let document = raw as RawDocument
  const { kind, formatVersion } = document
  if (typeof kind !== 'string' || typeof formatVersion !== 'number') return raw

  const target = targetVersions[kind]
  if (target === undefined) return raw
  if (formatVersion > target) {
    throw new NewerFormatError(`${kind} document`, formatVersion, target)
  }

  for (let version = formatVersion; version < target; version++) {
    const step = migrations[kind]?.[version]
    if (!step) {
      throw new Error(`No upgrade step for ${kind} documents from format ${version}.`)
    }
    document = { ...step(document), formatVersion: version + 1 }
  }
  return document
}
