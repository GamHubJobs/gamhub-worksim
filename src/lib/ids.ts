/**
 * Creates a new unique ID for a saved record (a document, version, backup entry, ...).
 *
 * IDs are random UUIDs, for example "3b241101-e2bb-4255-8caf-4136c566a962".
 * Random IDs can be created on any device without asking a server, which is
 * what makes local-first saving and later cloud sync possible.
 */
export function createId(): string {
  return crypto.randomUUID()
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Checks whether a value looks like an ID created by `createId`. */
export function isId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}
