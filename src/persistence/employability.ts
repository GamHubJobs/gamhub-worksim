/**
 * The player's own words for the employability profile (display name,
 * headline, summary, hidden sections), kept in the `meta` table, so they are
 * in backups too. Everything else in the profile is generated from records.
 */
import {
  defaultProfileSettings,
  ProfileSettingsSchema,
  type ProfileSettings,
} from '../game/employabilityProfile'
import { db as defaultDb, type WorkSimDatabase } from './db'
import { getMetaValue, setMetaValue } from './meta'

const KEY = 'employabilityProfile'

export async function getProfileSettings(
  fallbackName: string,
  database: WorkSimDatabase = defaultDb,
): Promise<ProfileSettings> {
  return (
    (await getMetaValue(KEY, ProfileSettingsSchema, database)) ??
    defaultProfileSettings(fallbackName)
  )
}

/** Saves the settings; anything outside the allowed fields is dropped. */
export async function saveProfileSettings(
  settings: ProfileSettings,
  database: WorkSimDatabase = defaultDb,
): Promise<ProfileSettings> {
  const clean = ProfileSettingsSchema.parse(settings)
  await setMetaValue(KEY, clean, database)
  return clean
}
