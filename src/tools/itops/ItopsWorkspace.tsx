/**
 * IT Operations in the Help Desk: the Tools menu's screens (Server Room,
 * Computer Deployment, PC Shelf, Asset Management, Ship Manager, Mail Admin,
 * Mail Security). Every button runs a pure action from model.ts or
 * deployment.ts; the tickets react to the changed state.
 */
import { lazy, Suspense, useState } from 'react'
import type { ToolWorkspaceProps } from '../ui'
import { FeedbackBar, type Feedback, type SectionProps } from './kit'
import type { ItopsState } from './schema'

const ServerRoom = lazy(() => import('./ServerRoom'))
const Deployment = lazy(() => import('./DeploymentConsole'))
const Shelf = lazy(() => import('./Shelf'))
const Assets = lazy(() => import('./Assets'))
const ShipManager = lazy(() => import('./ShipManager'))
const MailAdmin = lazy(() => import('./MailAdmin'))
const MailSecurity = lazy(() => import('./MailSecurity'))
const RepairBench = lazy(() => import('./RepairBench'))
const CommsCabinet = lazy(() => import('./CommsCabinet'))

const ITOPS_SECTIONS = [
  'server-room',
  'deployment',
  'shelf',
  'repair',
  'cabinet',
  'assets',
  'ship',
  'mail-admin',
  'mail-security',
] as const
type ItopsSection = (typeof ITOPS_SECTIONS)[number]

export default function ItopsWorkspace({
  state,
  readOnly,
  onUpdate,
  initialSection,
  now = () => Date.now(),
  officeTime = () => '',
  tickets = [],
  onOpenSection,
  onSite = false,
}: ToolWorkspaceProps<ItopsState>) {
  const [section, setSection] = useState<ItopsSection>(
    (ITOPS_SECTIONS as readonly string[]).includes(initialSection ?? '')
      ? (initialSection as ItopsSection)
      : 'server-room',
  )
  const [feedback, setFeedback] = useState<Feedback>({ problems: [] })
  const editable = !readOnly && !!onUpdate

  const props: SectionProps = {
    state,
    editable,
    now,
    officeTime,
    tickets,
    setFeedback,
    onSite,
    act: (fn, done) => {
      const result = fn(state)
      if (!editable) return result
      setFeedback({
        problems: result.problems,
        note: result.problems.length ? undefined : (result.note ?? done),
      })
      if (result.problems.length === 0) onUpdate?.((s) => fn(s).state)
      return result
    },
    deploy: (fn) => {
      const result = fn(state)
      if (!editable) return result
      setFeedback({ problems: result.problems, note: result.note })
      if (result.state !== state) onUpdate?.((s) => fn(s).state)
      return result
    },
    open: (id) => {
      setFeedback({ problems: [] })
      if (onOpenSection) onOpenSection(id)
      else if ((ITOPS_SECTIONS as readonly string[]).includes(id))
        setSection(id as ItopsSection)
    },
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-slate-50"
      data-testid="itops"
      data-section={section}
    >
      {readOnly && (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-900">
          Read-only: this is an earlier version.
        </p>
      )}
      {(feedback.problems.length > 0 || feedback.note) && (
        <div className="sticky top-0 z-10 px-4 pt-3">
          <FeedbackBar
            feedback={feedback}
            onClose={() => setFeedback({ problems: [] })}
          />
        </div>
      )}
      <Suspense fallback={<p className="p-6 text-sm text-slate-600">Opening…</p>}>
        {section === 'server-room' ? (
          <ServerRoom {...props} />
        ) : section === 'deployment' ? (
          <Deployment {...props} />
        ) : section === 'shelf' ? (
          <Shelf {...props} />
        ) : section === 'repair' ? (
          <RepairBench {...props} />
        ) : section === 'cabinet' ? (
          <CommsCabinet {...props} />
        ) : section === 'assets' ? (
          <Assets {...props} />
        ) : section === 'ship' ? (
          <ShipManager {...props} />
        ) : section === 'mail-admin' ? (
          <MailAdmin {...props} />
        ) : (
          <MailSecurity {...props} />
        )}
      </Suspense>
    </div>
  )
}
