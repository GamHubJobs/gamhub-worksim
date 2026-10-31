import {
  beginSession,
  endSession,
  resumeSession,
  type SessionStart,
} from '../persistence/session'

/**
 * Starts tracking this session, so the next start can tell whether WorkSim
 * closed normally. Call once, before the app is shown.
 */
export function startAppSession(): SessionStart {
  const start = beginSession()
  window.addEventListener('pagehide', () => endSession())
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) resumeSession() // restored from the back/forward cache
  })
  return start
}
