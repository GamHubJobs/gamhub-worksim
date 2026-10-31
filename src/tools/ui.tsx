/**
 * The screens of the professional tools. Each is loaded only when the player
 * first opens that tool, so tools add nothing to the start-up download.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export interface ToolWorkspaceProps<State> {
  state: State
  readOnly: boolean
  /** Changes the saved state (autosave, undo and versions are handled outside). */
  onUpdate?: (change: (state: State) => State) => void
  /** Sections still locked for this player: section ID → the level that unlocks it. */
  lockedSections: Record<string, string>
}

// oxlint-disable-next-line no-explicit-any -- each tool has its own state type
type Workspace = LazyExoticComponent<ComponentType<ToolWorkspaceProps<any>>>

const WORKSPACES: Record<string, Workspace> = {
  books: lazy(() => import('./books/BooksWorkspace')),
}

export function getWorkspace(toolId: string): Workspace | undefined {
  return WORKSPACES[toolId]
}
