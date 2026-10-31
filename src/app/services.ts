/** App-wide services shared with the apps through React context. */
import { createContext, useContext } from 'react'
import type { SessionStart } from '../persistence/session'

export interface AppServices {
  session: SessionStart
  /**
   * Registers a function that saves pending work. Called before backups and
   * before another tab takes over. Returns a function to unregister.
   */
  registerFlush: (flush: () => Promise<boolean>) => () => void
  /** Called after the first successful save, to ask for persistent storage. */
  onSaved: () => void
}

export const AppServicesContext = createContext<AppServices | null>(null)

export function useAppServices(): AppServices {
  const services = useContext(AppServicesContext)
  if (!services) throw new Error('AppServicesContext is missing')
  return services
}
