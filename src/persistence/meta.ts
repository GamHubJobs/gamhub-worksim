/** Small named values stored in the `meta` table (e.g. which document to open). */
import type { z } from 'zod'
import { db as defaultDb, type WorkSimDatabase } from './db'

/** Returns the stored value if it exists and matches the schema, otherwise undefined. */
export async function getMetaValue<T>(
  key: string,
  schema: z.ZodType<T>,
  database: WorkSimDatabase = defaultDb,
): Promise<T | undefined> {
  const entry = await database.meta.get(key)
  const result = schema.safeParse(entry?.value)
  return result.success ? result.data : undefined
}

export async function setMetaValue(
  key: string,
  value: unknown,
  database: WorkSimDatabase = defaultDb,
): Promise<void> {
  await database.meta.put({ key, value })
}
