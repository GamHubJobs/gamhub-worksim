/**
 * What the team board on the floor shows, worked out from the save (the
 * career's own assignments and their status in Tasks): the team's name, and
 * the work in hand, with what is done ticked off. The board in 3D
 * (TeamBoard.tsx) draws it, so finishing a task in the app changes the board on
 * the wall. Pure, so it is tested without 3D.
 */
import { activeDepartment } from '../../content/departments'
import { getBrief } from '../../engineering/briefs'
import {
  activeProject,
  currentStage,
  latest,
  siteProgress,
} from '../../engineering/engine'
import { STAGES } from '../../engineering/quantities'
import {
  assignmentStatus,
  careerAssignments,
  type AssignmentStatus,
  type ProfileData,
} from '../../game/career'

export type BoardState = 'done' | 'doing' | 'next' | 'redo'

export interface Board {
  team: string
  items: Array<{ title: string; state: BoardState }>
  done: number
  total: number
  /**
   * The project in hand, where the career has one (the engineer's: its title,
   * the latest revision and where the site is), from the save.
   */
  project?: string
  /** Each task's state, by the assignment's id (for the equipment it is done at). */
  tasks: Record<string, BoardState>
  /** Every task of the career by state (the board only lists some). */
  counts: { todo: number; doing: number; redo: number; done: number; total: number }
}

const STATE: Partial<Record<AssignmentStatus, BoardState>> = {
  completed: 'done',
  'in-progress': 'doing',
  'needs-revision': 'redo',
  available: 'next',
}

/**
 * The board for this player's career: the last two tasks done and everything
 * open, up to six lines (the work in hand first).
 */
export function boardFor(profile: ProfileData): Board {
  const all = careerAssignments(profile.careerId).map((a) => ({
    id: a.id,
    title: a.title,
    state: STATE[assignmentStatus(profile, a)],
  }))
  const line = (a: (typeof all)[number]) => ({ title: a.title, state: a.state! })
  const open = all.filter((a) => a.state && a.state !== 'done').map(line)
  const done = all.filter((a) => a.state === 'done').map(line)
  const tasks: Record<string, BoardState> = {}
  for (const a of all) if (a.state) tasks[a.id] = a.state
  const order: BoardState[] = ['doing', 'redo', 'next']
  open.sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state))
  const items = [...open.slice(0, 4), ...done.slice(-2)].slice(0, 6)
  const count = (s: BoardState) => all.filter((a) => a.state === s).length
  return {
    project: projectLine(profile),
    tasks,
    team: activeDepartment().name,
    items,
    done: done.length,
    total: all.length,
    counts: {
      todo: count('next'),
      doing: count('doing'),
      redo: count('redo'),
      done: done.length,
      total: all.length,
    },
  }
}

/** The engineer's project, as it stands: "Yard store · rev 2 approved · on site: Excavation · 34% built". */
function projectLine(profile: ProfileData): string | undefined {
  const project = activeProject(profile)
  if (!project) return undefined
  const title = getBrief(project.id)?.title ?? project.id
  const rev = latest(project)
  const parts = [title, `rev ${rev.n} ${rev.status}`]
  const stage = currentStage(project)
  if (project.status === 'complete') parts.push('handed over')
  else if (stage)
    parts.push(
      `on site: ${STAGES[stage.id].name}`,
      `${Math.round(siteProgress(project) * 100)}% built`,
    )
  return parts.join(' · ')
}
