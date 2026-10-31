import {
  beginSession,
  endSession,
  resumeSession,
  type SessionStart,
} from '../persistence/session'

let session: SessionStart | null = null
let ownsSession = false

/**
 * Starts tracking this session, so the next start can tell whether WorkSim
 * closed normally. Only the tab that edits (owns the tab lock) tracks the
 * session. Safe to call more than once: the first result is remembered.
 */
export function startAppSession(): SessionStart {
  if (!session) {
    session = beginSession()
    window.addEventListener('pagehide', () => {
      if (ownsSession) endSession()
    })
    window.addEventListener('pageshow', (event) => {
      if (event.persisted && ownsSession) resumeSession() // back/forward cache
    })
  } else if (!ownsSession) {
    resumeSession()
  }
  ownsSession = true
  return session
}

/** Ends the session normally because another tab is taking over. */
export function handOverAppSession() {
  if (ownsSession) endSession()
  ownsSession = false
}
