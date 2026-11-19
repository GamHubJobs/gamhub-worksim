/**
 * The job feeds, in the order their adverts are preferred when the same job
 * appears in two. A new feed is one more file like these and one more line
 * here: the search, the filters, the saved jobs and the app take it as it is.
 */
import type { ProviderId } from '../types'
import { adzuna } from './adzuna'
import { arbeitnow } from './arbeitnow'
import type { Provider } from './common'
import { jobicy } from './jobicy'
import { remoteok } from './remoteok'
import { remotive } from './remotive'

export const PROVIDERS: Provider[] = [adzuna, jobicy, remotive, remoteok, arbeitnow]

export function providerOf(id: ProviderId): Provider {
  return PROVIDERS.find((p) => p.id === id)!
}

export type { Provider, FieldTerms } from './common'
