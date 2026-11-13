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
  /** The time now (ms), for tools whose rules depend on it (e.g. a verification expiring). */
  now?: () => number
  /** The section to open first (tools with several sections). */
  initialSection?: string
  /** Whether a device can be reached on the network (from Network Tools, when present). */
  reachable?: (device: string) => boolean
  /** Tickets about something in the tool (a device, an account), for its detail view. */
  related?: (entity: string) => Array<{ id: string; title: string; open: boolean }>
  /** The queue's tickets (for linking a voicemail or call to one). */
  tickets?: Array<{ id: string; title: string; open: boolean }>
  /** Where a colleague is now, from the office schedule. */
  presence?: (person: string) => 'available' | 'busy' | 'away'
  /** The office clock as shown, e.g. "09:42" (for messages). */
  officeTime?: () => string
  /** Opens another section of the tool from inside it (e.g. the PC Shelf's "Open Ship Manager"). */
  onOpenSection?: (section: string) => void
  /** Opened in person at the equipment (in the office), not from the Help Desk computer. */
  onSite?: boolean
}

// oxlint-disable-next-line no-explicit-any -- each tool has its own state type
type Workspace = LazyExoticComponent<ComponentType<ToolWorkspaceProps<any>>>

const WORKSPACES: Record<string, Workspace> = {
  books: lazy(() => import('./books/BooksWorkspace')),
  directory: lazy(() => import('./directory/DirectoryWorkspace')),
  devices: lazy(() => import('./devices/DevicesWorkspace')),
  comms: lazy(() => import('./comms/CommsWorkspace')),
  soc: lazy(() => import('./soc/SecurityConsole')),
  itops: lazy(() => import('./itops/ItopsWorkspace')),
  network: lazy(() => import('./network/NetworkWorkspace')),
  social: lazy(() => import('./social/SocialWorkspace')),
  seo: lazy(() => import('./seo/SeoWorkspace')),
  campaigns: lazy(() => import('./campaigns/CampaignsWorkspace')),
  analytics: lazy(() => import('./analytics/AnalyticsWorkspace')),
  datastudio: lazy(() => import('./datastudio/DataStudioWorkspace')),
  api: lazy(() => import('./api/ApiWorkspace')),
}

export function getWorkspace(toolId: string): Workspace | undefined {
  return WORKSPACES[toolId]
}
