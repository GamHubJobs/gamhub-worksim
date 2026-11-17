/**
 * How the team's work stands, from the save (workBoard.ts), for the things on
 * the floor that show it: the sprint board's columns and the build monitor, the
 * dashboards, the campaign wall, the ledger desk's trays, the pigeonholes.
 * Provided by the office scene; zero everywhere when there is no save to show.
 */
import { createContext, useContext } from 'react'
import type { Board } from './workBoard'

export interface WorkState {
  /** Not started yet. */
  todo: number
  doing: number
  /** Handed in and sent back to put right. */
  redo: number
  done: number
  total: number
}

export const NO_WORK: WorkState = { todo: 0, doing: 0, redo: 0, done: 0, total: 0 }

export const WorkContext = createContext<WorkState>(NO_WORK)
export const useWork = (): WorkState => useContext(WorkContext)

/** The counts, from the board's JSON (as the scene is given it). */
export function workStateOf(json: string | undefined): WorkState {
  if (!json) return NO_WORK
  try {
    const b = JSON.parse(json) as Board & { counts?: WorkState }
    return b.counts ?? NO_WORK
  } catch {
    return NO_WORK
  }
}
