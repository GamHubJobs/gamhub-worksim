/**
 * Ward Systems → Patient cases and Case progress: the case library, the
 * bedside (conversation, actions within the player's role, the monitor, the
 * event log, the 3D bedside, hints and the tutor), the debrief with Grace's
 * feedback, and the progress dashboard with Grace's assigned cases.
 *
 * Everything shown comes from the case engine and the saved attempts. An AI
 * model (the player's own, if switched on in WorkSim AI) may only reword the
 * patient's reply or expand the tutor's answer; it never changes the record.
 */
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { askAi } from '../../ai/service'
import { readAiSettings } from '../../ai/settings'
import { ACTIONS, allowed, outOfScope } from '../../clinical/actions'
import { course, history } from '../../clinical/assessment'
import { getCase, casesFor, CASES } from '../../clinical/cases'
import { clockNow, measureLabel, phaseOf } from '../../clinical/engine'
import {
  CATEGORY_NAMES,
  DIFFICULTIES,
  ROLE_TITLES,
  ROOM_NAMES,
  type ActionCategory,
  type CaseDef,
  type Difficulty,
  type Measure,
} from '../../clinical/model'
import type { Attempt, Encounter } from '../../clinical/schema'
import { graceFeedback } from '../../clinical/supervisor'
import { hint, patientRequest, tutorAnswer, tutorRequest } from '../../clinical/tutor'
import {
  activeCase,
  caseAct,
  caseSay,
  caseWait,
  casesOf,
  chartValues,
  dashboard,
  graceAssigns,
  debriefOf,
  finishCase,
  roleFor,
  startCase,
} from '../../clinical/ward'
import { clockText, escalationFor, warningScore } from './model'
import type { ClinicalState } from './schema'
import { field, primary, secondary, type Run } from './styles'

const Bedside3D = lazy(() => import('./Bedside3D'))

/** The 3D bedside is extra: if it cannot be shown (no WebGL), the case carries on without it. */
class ViewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('The 3D bedside could not be shown.', error)
  }
  render() {
    return this.state.failed ? (
      <p className="rounded bg-slate-100 p-2 text-xs text-slate-600">
        The 3D bedside cannot be shown on this computer. Every piece of equipment is also
        an action button.
      </p>
    ) : (
      this.props.children
    )
  }
}

export interface Player {
  levelId: string
  day: number
}

const DIFF_STYLE: Record<Difficulty, string> = {
  beginner: 'bg-emerald-100 text-emerald-900',
  intermediate: 'bg-sky-100 text-sky-900',
  advanced: 'bg-amber-100 text-amber-900',
  expert: 'bg-rose-100 text-rose-900',
}

const Badge = ({ d }: { d: Difficulty }) => (
  <span
    className={`rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${DIFF_STYLE[d]}`}
  >
    {d}
  </span>
)

const ESCALATIONS = new Set(['tell-nurse', 'call-outreach'])
const NOTES = new Set(['write-note', 'update-fluid-chart', 'handover'])
const ORDER: ActionCategory[] = [
  'communication',
  'care',
  'observations',
  'examination',
  'specimens',
  'investigations',
  'documentation',
  'escalation',
  'clinical-communication',
  'handover',
  'follow-up',
]

function aiReady() {
  const s = readAiSettings()
  return s.engine !== 'builtin' && s.consent ? s : null
}

// ---------------------------------------------------------------------------
// Patient cases
// ---------------------------------------------------------------------------

export function CasesView({
  state,
  canEdit,
  run,
  player,
}: {
  state: ClinicalState
  canEdit: boolean
  run: Run
  player: Player
}) {
  const current = activeCase(state)
  const [review, setReview] = useState<string | null>(null)
  const attempts = casesOf(state).attempts
  const reviewing = review ? attempts.find((a) => a.id === review) : null

  if (current)
    return (
      <Bedside
        def={current.def}
        enc={current.enc}
        canEdit={canEdit}
        run={run}
        player={player}
        attempts={attempts}
        onFinished={(id) => setReview(id)}
      />
    )
  if (reviewing)
    return (
      <Debrief
        attempt={reviewing}
        earlier={attempts.filter(
          (a) =>
            a.caseId === reviewing.caseId &&
            a.id !== reviewing.id &&
            attempts.indexOf(a) < attempts.indexOf(reviewing),
        )}
        onBack={() => setReview(null)}
        onReplay={
          canEdit
            ? () => {
                if (
                  run((s) =>
                    startCase(s, reviewing.caseId, reviewing.difficulty, player.levelId),
                  )
                )
                  setReview(null)
              }
            : undefined
        }
      />
    )
  return (
    <Library
      state={state}
      canEdit={canEdit}
      run={run}
      player={player}
      onReview={setReview}
    />
  )
}

function Library({
  state,
  canEdit,
  run,
  player,
  onReview,
}: {
  state: ClinicalState
  canEdit: boolean
  run: Run
  player: Player
  onReview: (id: string) => void
}) {
  const role = roleFor(player.levelId)
  const cases = casesOf(state)
  const [filter, setFilter] = useState<Difficulty | 'all'>('all')
  const [chosen, setChosen] = useState<string>(CASES[0].id)
  const def = getCase(chosen)!
  const [difficulty, setDifficulty] = useState<Difficulty>(def.difficulty)
  const assigned = cases.assigned.filter((a) => !a.completed)
  const list = CASES.filter((c) => filter === 'all' || c.difficulty === filter)
  const h = history(cases.attempts, def.id)
  const locked = def.role > role
  const pick = (id: string) => {
    setChosen(id)
    setDifficulty(getCase(id)!.difficulty)
  }

  return (
    <div
      className="flex min-h-0 flex-col gap-3 p-3 lg:flex-row"
      data-testid="case-library"
    >
      <section className="min-w-0 flex-1" aria-label="Case library">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">
            Case library ({CASES.length} fictional patients)
          </h2>
          <label className="ml-auto text-xs">
            Show{' '}
            <select
              className={field}
              value={filter}
              onChange={(e) => setFilter(e.target.value as Difficulty | 'all')}
            >
              <option value="all">All levels</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>
        {assigned.length > 0 && (
          <p
            className="mb-2 rounded bg-teal-50 px-2 py-1 text-xs text-teal-900"
            data-testid="assigned-banner"
          >
            Assigned by Grace:{' '}
            {assigned
              .map(
                (a) => `${getCase(a.caseId)?.title} (${a.difficulty}, due day ${a.due})`,
              )
              .join('; ')}
          </p>
        )}
        <ul className="grid gap-2 sm:grid-cols-2">
          {list.map((c) => {
            const hc = history(cases.attempts, c.id)
            return (
              <li key={c.id}>
                <button
                  type="button"
                  data-testid={`case-${c.id}`}
                  aria-pressed={c.id === chosen}
                  onClick={() => pick(c.id)}
                  className={`w-full rounded border p-2 text-left text-sm ${c.id === chosen ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white hover:border-slate-400'}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{c.title}</span>
                    <Badge d={c.difficulty} />
                    {hc.passed && (
                      <span className="text-xs text-emerald-700">✓ passed</span>
                    )}
                  </span>
                  <span className="block text-xs text-slate-600">
                    {c.type} · {ROOM_NAMES[c.room]} · {c.patient.name}, {c.patient.age}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {hc.count
                      ? `${hc.count} attempt${hc.count === 1 ? '' : 's'} · best ${hc.best!.score}%`
                      : 'Not attempted'}
                    {c.role > role && ` · for ${ROLE_TITLES[c.role]}s`}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
      <aside
        className="w-full shrink-0 rounded border border-slate-200 bg-white p-3 text-sm lg:w-80"
        aria-label="Case details"
      >
        <h3 className="font-semibold">{def.title}</h3>
        <p className="text-xs text-slate-600">
          {def.type} · {ROOM_NAMES[def.room]}
        </p>
        <p className="mt-2">{def.presentation}</p>
        <p className="mt-1 text-xs text-slate-600">
          Written for: {ROLE_TITLES[def.role]} and above. You are: {ROLE_TITLES[role]}.
        </p>
        <label className="mt-2 block text-xs">
          Difficulty{' '}
          <select
            className={field}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            data-testid="case-difficulty"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-1 text-[11px] text-slate-500">
          Difficulty changes the hints, the time allowed and the pass mark, never the
          patient.
        </p>
        <button
          type="button"
          className={`${primary} mt-2 w-full`}
          disabled={!canEdit || locked}
          data-testid="case-start"
          onClick={() => run((s) => startCase(s, def.id, difficulty, player.levelId))}
        >
          {locked ? `For ${ROLE_TITLES[def.role]}s` : 'Start case'}
        </button>
        {h.count > 0 && (
          <div className="mt-3 text-xs" data-testid="case-history">
            <p className="font-medium">Your attempts</p>
            <ul>
              {(
                [
                  ['First', h.first],
                  ['Latest', h.latest],
                  ['Best', h.best],
                ] as const
              ).map(([name, a]) =>
                a ? (
                  <li key={name} className="flex items-center justify-between gap-2">
                    <span>
                      {name}: {a.score}% ({a.difficulty}) {a.passed ? '✓' : '✗'}
                    </span>
                    {a.encounter && (
                      <button
                        type="button"
                        className="text-teal-800 underline"
                        onClick={() => onReview(a.id)}
                      >
                        Debrief
                      </button>
                    )}
                  </li>
                ) : null,
              )}
            </ul>
          </div>
        )}
      </aside>
    </div>
  )
}

// ---------------------------------------------------------------------------
// At the bedside
// ---------------------------------------------------------------------------

function Bedside({
  def,
  enc,
  canEdit,
  run,
  player,
  attempts,
  onFinished,
}: {
  def: CaseDef
  enc: Encounter
  canEdit: boolean
  run: Run
  player: Player
  attempts: Attempt[]
  onFinished: (id: string) => void
}) {
  const phase = phaseOf(def, enc.phase)
  const role = roleFor(player.levelId)
  const [said, setSaid] = useState('')
  const [composer, setComposer] = useState<string | null>(null)
  const [sbar, setSbar] = useState({ s: '', b: '', a: '', r: '' })
  const [note, setNote] = useState('')
  const [tutorQ, setTutorQ] = useState('')
  const [tutorA, setTutorA] = useState<string | null>(null)
  const [voices, setVoices] = useState<Record<number, string>>({})
  const [aiVoice, setAiVoice] = useState(false)
  const [show3d, setShow3d] = useState(true)
  const end = useRef<HTMLLIElement>(null)
  const ai = useMemo(() => aiReady(), [])
  const live = canEdit && !enc.ended
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [enc.log.length])

  const conversation = enc.log
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.kind === 'said' || e.kind === 'patient')

  async function send() {
    const text = said.trim()
    if (!text || !live) return
    let reply = ''
    let index = -1
    const ok = run((s) => {
      const r = caseSay(s, text)
      reply = r.reply
      const log = activeCase(r.state)?.enc.log ?? []
      for (let k = log.length - 1; k >= 0; k--)
        if (log[k].kind === 'patient') {
          index = k
          break
        }
      return r
    })
    if (!ok) return
    setSaid('')
    if (ai && aiVoice && reply) {
      const req = patientRequest(def, enc, text, reply)
      try {
        const answer = await askAi(
          {
            messages: req.messages,
            context: { items: [{ kind: 'case', ...req.context }], trimmed: 0 },
            mode: ai.mode,
            action: 'patient-voice',
          },
          ai,
        )
        if (!answer.fallback && answer.source.model)
          setVoices((v) => ({ ...v, [index]: answer.text }))
      } catch {
        // The engine's own words stay.
      }
    }
  }

  function pick(actionId: string) {
    if (!live) return
    if (ESCALATIONS.has(actionId) || NOTES.has(actionId) || actionId === 'ask-nurse') {
      setComposer(actionId)
      return
    }
    run((s) => caseAct(s, actionId))
  }

  function submitComposer() {
    if (!composer) return
    const text = ESCALATIONS.has(composer)
      ? `Situation: ${sbar.s}\nBackground: ${sbar.b}\nAssessment: ${sbar.a}\nRecommendation: ${sbar.r}`
      : note
    if (ESCALATIONS.has(composer) && !sbar.s.trim()) return
    if (run((s) => caseAct(s, composer, text))) {
      setComposer(null)
      setSbar({ s: '', b: '', a: '', r: '' })
      setNote('')
    }
  }

  function end_(reason: 'finished' | 'abandoned') {
    let id = ''
    if (
      run((s) => {
        const r = finishCase(s, player.day, reason)
        id = casesOf(r.state).attempts.at(-1)?.id ?? ''
        return r
      })
    )
      onFinished(id)
  }

  const reads = enc.measurements.reduce<
    Partial<Record<Measure, { value: string; t: number }>>
  >((m, x) => ({ ...m, [x.measure]: { value: x.value, t: x.t } }), {})
  const chart = chartValues(def, enc)
  const score = chart ? warningScore(chart) : null
  const showScore = enc.difficulty === 'beginner' || enc.difficulty === 'intermediate'
  const groups = ORDER.map((c) => ({
    c,
    actions: ACTIONS.filter((a) => a.category === c && !outOfScope(a)),
  })).filter((g) => g.actions.length)
  const clinician = ACTIONS.filter(outOfScope)
  const easy = enc.difficulty === 'beginner' || enc.difficulty === 'intermediate'

  return (
    <div
      className="flex min-h-0 flex-col gap-3 p-3 xl:flex-row"
      data-testid="case-active"
    >
      <section
        className="flex min-w-0 flex-col gap-2 xl:w-[34%]"
        aria-label="The patient"
      >
        <div
          className="rounded border border-slate-200 bg-white p-2 text-sm"
          data-testid="case-patient"
        >
          <p className="font-semibold">
            {def.patient.name}, {def.patient.age} · {ROOM_NAMES[def.room]}{' '}
            <Badge d={enc.difficulty as Difficulty} />
          </p>
          <p className="text-xs text-slate-600">{def.patient.background}</p>
          <p
            className={`mt-1 text-xs font-medium ${def.patient.allergies.length ? 'text-red-800' : 'text-slate-700'}`}
          >
            Allergies:{' '}
            {def.patient.allergies.length
              ? def.patient.allergies
                  .map((a) => `${a.substance} (${a.reaction})`)
                  .join(', ')
              : 'none known'}
          </p>
          <p className="mt-1 rounded bg-slate-100 px-2 py-1 text-xs">
            <span className="font-medium">{def.task.from}:</span>{' '}
            {def.task.text.replaceAll('*', '')}
          </p>
          {easy && (
            <ul
              className="mt-1 list-disc pl-5 text-xs text-slate-700"
              aria-label="Objectives"
            >
              {def.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {clockNow(enc)} · {Math.floor(enc.t)} of {def.limit} minutes · you are a{' '}
            {ROLE_TITLES[role]}
          </p>
        </div>
        <div
          className="rounded border border-slate-200 bg-white p-2 text-sm"
          data-testid="case-looks"
          aria-live="polite"
        >
          <p className="text-xs font-medium text-slate-500">What you see</p>
          <p>{phase.looks}</p>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={show3d}
            onChange={(e) => setShow3d(e.target.checked)}
          />{' '}
          Bedside view (3D)
        </label>
        {show3d && (
          <ViewBoundary>
            <Suspense fallback={<div className="h-56 rounded bg-slate-200" />}>
              <Bedside3D def={def} enc={enc} phase={phase} onPick={pick} />
            </Suspense>
          </ViewBoundary>
        )}
        <div
          className="rounded border border-slate-200 bg-white p-2 text-sm"
          data-testid="case-monitor"
        >
          <p className="text-xs font-medium text-slate-500">Your observations</p>
          {Object.keys(reads).length === 0 ? (
            <p className="text-xs text-slate-500">Nothing measured yet.</p>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {(Object.keys(reads) as Measure[]).map((m) => (
                  <tr key={m}>
                    <td className="pr-2 text-slate-600">{measureLabel(m)}</td>
                    <td className="font-medium">{reads[m]!.value}</td>
                    <td className="text-right text-slate-500">
                      {clockText((enc.startClock + Math.floor(reads[m]!.t)) % 1440)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {score && showScore && (
            <p className="mt-1 text-xs" data-testid="case-score">
              Early-warning score {score.score}:{' '}
              {escalationFor(score.score, score.anyThree).action}
            </p>
          )}
        </div>
      </section>

      <section
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-2"
        aria-label="Conversation and actions"
      >
        <div className="rounded border border-slate-200 bg-white p-2">
          <p className="text-xs font-medium text-slate-500">
            Talk to {def.patient.callMe}
          </p>
          <ol
            className="max-h-48 space-y-1 overflow-y-auto text-sm"
            data-testid="case-conversation"
          >
            {conversation.map(({ e, i }) => (
              <li key={i} className={e.kind === 'said' ? 'text-right' : ''}>
                <span
                  className={`inline-block rounded px-2 py-1 ${e.kind === 'said' ? 'bg-teal-700 text-white' : 'bg-slate-100'}`}
                >
                  {e.kind === 'patient' ? (voices[i] ?? e.text) : e.text}
                </span>
              </li>
            ))}
            <li ref={end} />
          </ol>
          <form
            className="mt-1 flex gap-1"
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
          >
            <input
              className={`${field} flex-1`}
              value={said}
              onChange={(e) => setSaid(e.target.value)}
              placeholder={`Say something to ${def.patient.callMe}…`}
              aria-label={`Say to ${def.patient.callMe}`}
              disabled={!live}
              data-testid="case-say"
              maxLength={500}
            />
            <button
              type="submit"
              className={primary}
              disabled={!live || !said.trim()}
              data-testid="case-send"
            >
              Say
            </button>
          </form>
          {ai && (
            <label className="mt-1 flex items-center gap-1 text-[11px] text-slate-600">
              <input
                type="checkbox"
                checked={aiVoice}
                onChange={(e) => setAiVoice(e.target.checked)}
              />
              Let my AI model voice the patient (same facts, their words)
            </label>
          )}
        </div>

        {composer && (
          <div
            className="rounded border border-teal-300 bg-teal-50 p-2 text-sm"
            data-testid="case-composer"
          >
            <p className="font-medium">{ACTIONS.find((a) => a.id === composer)?.label}</p>
            {ESCALATIONS.has(composer) ? (
              (
                [
                  ['s', 'Situation'],
                  ['b', 'Background'],
                  ['a', 'Assessment (numbers, score, what you saw)'],
                  ['r', 'Recommendation (what you need)'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="mt-1 block text-xs">
                  {label}
                  <textarea
                    className={`${field} block w-full`}
                    rows={k === 'a' ? 2 : 1}
                    value={sbar[k]}
                    onChange={(e) => setSbar({ ...sbar, [k]: e.target.value })}
                  />
                </label>
              ))
            ) : (
              <textarea
                className={`${field} mt-1 block w-full`}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                aria-label={composer === 'ask-nurse' ? 'Your question' : 'Note'}
                placeholder={
                  composer === 'ask-nurse'
                    ? 'What do you want to ask Owen?'
                    : 'What you saw, what you did, who you told, what happens next.'
                }
              />
            )}
            <div className="mt-1 flex gap-1">
              <button
                type="button"
                className={primary}
                onClick={submitComposer}
                data-testid="composer-submit"
              >
                {ESCALATIONS.has(composer)
                  ? 'Make the call'
                  : composer === 'ask-nurse'
                    ? 'Ask'
                    : 'Sign the note'}
              </button>
              <button
                type="button"
                className={secondary}
                onClick={() => setComposer(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div
          className="rounded border border-slate-200 bg-white p-2"
          aria-label="Actions"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {groups.map(({ c, actions }) => (
              <fieldset key={c} className="min-w-0">
                <legend className="text-xs font-medium text-slate-500">
                  {CATEGORY_NAMES[c]}
                </legend>
                <div className="flex flex-wrap gap-1">
                  {actions.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs hover:bg-slate-50 disabled:opacity-50"
                      disabled={!live}
                      data-testid={`action-${a.id}`}
                      title={
                        allowed(a, role)
                          ? `${a.minutes} min`
                          : 'Above your grade: you will ask a senior'
                      }
                      onClick={() => pick(a.id)}
                    >
                      {a.label}
                      {!allowed(a, role) && ' ↗'}
                      {(enc.done[a.id]?.length ?? 0) > 0 && ' ✓'}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            <fieldset className="min-w-0">
              <legend className="text-xs font-medium text-slate-500">
                For a nurse or doctor (you ask them)
              </legend>
              <div className="flex flex-wrap gap-1">
                {clinician.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="rounded border border-dashed border-slate-400 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 disabled:opacity-50"
                    disabled={!live}
                    data-testid={`action-${a.id}`}
                    onClick={() => pick(a.id)}
                  >
                    {a.label} ↗
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100 pt-2">
            {easy && (
              <button
                type="button"
                className={secondary}
                disabled={!live}
                data-testid="case-hint"
                onClick={() => setTutorA(hint(def, enc))}
              >
                Hint
              </button>
            )}
            <button
              type="button"
              className={secondary}
              disabled={!live}
              onClick={() => run((s) => caseWait(s, 5))}
            >
              Wait 5 minutes
            </button>
            <button
              type="button"
              className={`${primary} ml-auto`}
              disabled={!canEdit}
              data-testid="case-finish"
              onClick={() => end_('finished')}
            >
              {enc.ended ? 'See the debrief' : 'Finish case'}
            </button>
            {!enc.ended && (
              <button
                type="button"
                className={secondary}
                disabled={!canEdit}
                onClick={() => end_('abandoned')}
              >
                Leave case
              </button>
            )}
          </div>
        </div>
        <Tutor
          def={def}
          enc={enc}
          question={tutorQ}
          setQuestion={setTutorQ}
          answer={tutorA}
          setAnswer={setTutorA}
        />
      </section>

      <section className="min-w-0 xl:w-[24%]" aria-label="What has happened">
        <div className="rounded border border-slate-200 bg-white p-2">
          <p className="text-xs font-medium text-slate-500">Timeline</p>
          <ol
            className="max-h-[32rem] space-y-1 overflow-y-auto text-xs"
            data-testid="case-log"
          >
            {enc.log
              .map((e, i) => ({ e, i }))
              .filter(({ e }) => e.kind !== 'said' && e.kind !== 'patient')
              .map(({ e, i }) => (
                <li
                  key={i}
                  className={
                    e.kind === 'change'
                      ? 'font-medium text-red-800'
                      : e.kind === 'referred'
                        ? 'text-indigo-800'
                        : e.kind === 'conduct'
                          ? 'text-amber-800'
                          : ''
                  }
                >
                  <span className="text-slate-500">
                    {clockText((enc.startClock + Math.floor(e.t)) % 1440)}{' '}
                  </span>
                  {e.text}
                </li>
              ))}
          </ol>
          <p className="mt-1 text-[11px] text-slate-500">
            {attempts.filter((a) => a.caseId === def.id).length} earlier attempts at this
            case.
          </p>
        </div>
      </section>
    </div>
  )
}

function Tutor({
  def,
  enc,
  question,
  setQuestion,
  answer,
  setAnswer,
}: {
  def: CaseDef
  enc: Encounter | null
  question: string
  setQuestion: (s: string) => void
  answer: string | null
  setAnswer: (s: string | null) => void
}) {
  const ai = useMemo(() => aiReady(), [])
  const [busy, setBusy] = useState(false)
  async function ask(useAi: boolean) {
    const q = question.trim()
    if (!q) return
    if (!useAi || !ai) {
      setAnswer(tutorAnswer(q, def, enc))
      return
    }
    setBusy(true)
    const req = tutorRequest(q, def, enc)
    try {
      const a = await askAi(
        {
          messages: req.messages,
          context: { items: [{ kind: 'learning', ...req.context }], trimmed: 0 },
          mode: ai.mode,
          action: 'clinical-tutor',
        },
        ai,
      )
      setAnswer(
        a.fallback
          ? `${tutorAnswer(q, def, enc)}\n\n(Your AI model could not answer: ${a.fallback})`
          : a.text,
      )
    } catch {
      setAnswer(tutorAnswer(q, def, enc))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div
      className="rounded border border-slate-200 bg-white p-2 text-sm"
      data-testid="case-tutor"
    >
      <p className="text-xs font-medium text-slate-500">Tutor</p>
      <form
        className="flex gap-1"
        onSubmit={(e) => {
          e.preventDefault()
          void ask(false)
        }}
      >
        <input
          className={`${field} flex-1`}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about SBAR, the score, consent, this case…"
          aria-label="Ask the tutor"
          data-testid="tutor-ask"
        />
        <button type="submit" className={secondary} disabled={!question.trim()}>
          Ask
        </button>
        {ai && (
          <button
            type="button"
            className={secondary}
            disabled={!question.trim() || busy}
            onClick={() => void ask(true)}
          >
            {busy ? 'Asking…' : 'Ask my AI'}
          </button>
        )}
      </form>
      {answer && (
        <p
          className="mt-1 whitespace-pre-line rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-950"
          data-testid="tutor-answer"
        >
          {answer}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// The debrief
// ---------------------------------------------------------------------------

const OUTCOME: Record<string, string> = {
  done: '✓ Done',
  late: '◐ Late',
  missed: '✗ Missed',
  'not-needed': '– Not needed',
  avoided: '✓ Avoided',
  'done-unnecessary': '△ Not needed',
  'done-harmful': '✗ Harmful',
  referred: '↗ Asked a senior',
}

export function Debrief({
  attempt,
  earlier,
  onBack,
  onReplay,
}: {
  attempt: Attempt
  earlier: Attempt[]
  onBack: () => void
  onReplay?: () => void
}) {
  const full = debriefOf(attempt)
  const [q, setQ] = useState('')
  const [a, setA] = useState<string | null>(null)
  if (!full)
    return (
      <div className="p-3 text-sm">
        <p>
          {getCase(attempt.caseId)?.title}: {attempt.score}% (
          {attempt.passed ? 'passed' : 'not passed'}). The full record of this older
          attempt is no longer kept.
        </p>
        <button type="button" className={secondary} onClick={onBack}>
          Back
        </button>
      </div>
    )
  const { def, enc, debrief: d } = full
  const grace = graceFeedback(def, enc, d, earlier)
  const at = (t: number) => clockText((enc.startClock + Math.floor(t)) % 1440)
  const judged = d.items.filter(
    (i) => i.as !== 'optional' && i.outcome !== 'avoided' && i.outcome !== 'not-needed',
  )
  return (
    <div className="space-y-3 p-3 text-sm" data-testid="case-debrief">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">
          Debrief: {def.title} ({def.patient.name})
        </h2>
        <Badge d={attempt.difficulty} />
        <span
          className={`rounded px-2 py-0.5 font-semibold ${d.passed ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'}`}
          data-testid="debrief-score"
        >
          {d.score}% · {d.passed ? 'Passed' : 'Not passed'} (pass mark {d.passMark}%)
        </span>
        <span className="text-xs text-slate-500">
          {d.minutes} minutes · ended{' '}
          {enc.ended?.reason === 'time'
            ? 'when time ran out'
            : enc.ended?.reason === 'abandoned'
              ? 'by leaving'
              : 'by you'}
        </span>
        <span className="ml-auto flex gap-1">
          {onReplay && (
            <button
              type="button"
              className={primary}
              onClick={onReplay}
              data-testid="debrief-replay"
            >
              Replay
            </button>
          )}
          <button
            type="button"
            className={secondary}
            onClick={onBack}
            data-testid="debrief-back"
          >
            Back to cases
          </button>
        </span>
      </div>

      <div
        className="rounded border border-teal-200 bg-teal-50 p-2"
        data-testid="grace-feedback"
      >
        <p className="text-xs font-medium text-teal-900">Grace Mbeki, Ward Manager</p>
        {grace.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section aria-label="Scores by area">
          <h3 className="font-medium">Scores by area</h3>
          <ul className="space-y-1">
            {d.rubric
              .filter((r) => r.score !== null)
              .map((r) => (
                <li key={r.id} className="text-xs">
                  <span className="flex justify-between">
                    <span>{r.name}</span>
                    <span>{r.score}%</span>
                  </span>
                  <span className="block h-1.5 rounded bg-slate-200">
                    <span
                      className={`block h-1.5 rounded ${r.score! >= 70 ? 'bg-emerald-600' : r.score! >= 50 ? 'bg-amber-500' : 'bg-red-600'}`}
                      style={{ width: `${r.score}%` }}
                    />
                  </span>
                </li>
              ))}
          </ul>
        </section>
        <section aria-label="What the case looked for">
          <h3 className="font-medium">What the case looked for</h3>
          <table className="w-full text-xs" data-testid="debrief-items">
            <tbody>
              {judged.map((i) => (
                <tr key={i.action} className="border-b border-slate-100 align-top">
                  <td className="py-0.5 pr-2 whitespace-nowrap">{OUTCOME[i.outcome]}</td>
                  <td className="py-0.5 pr-2">
                    <span className="font-medium">{i.label}</span>{' '}
                    <span className="text-slate-500">
                      ({i.as}
                      {i.t !== null ? `, ${at(i.t)}` : ''})
                    </span>
                    <span className="block text-slate-600">{i.why}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section aria-label="How the patient changed">
          <h3 className="font-medium">How {def.patient.callMe} changed</h3>
          <ol className="text-xs">
            {course(def, enc).map((c) => (
              <li key={c.t} className={c.concerning ? 'text-red-800' : ''}>
                {at(c.t)}: {c.looks}
              </li>
            ))}
          </ol>
          {d.deterioration.at !== null && (
            <p className="mt-1 text-xs">
              Became concerning at {at(d.deterioration.at)};{' '}
              {d.deterioration.escalated !== null
                ? `escalated at ${at(d.deterioration.escalated)} (${d.deterioration.delay} min).`
                : 'never escalated.'}
            </p>
          )}
          {d.factsMissed.length > 0 && (
            <p className="mt-1 text-xs">
              Not found out: {d.factsMissed.map((f) => f.ask).join(', ')}.
            </p>
          )}
          {d.documentation.missing.length > 0 && (
            <p className="text-xs">
              Your notes did not mention: {d.documentation.missing.join(', ')}.
            </p>
          )}
          {d.referred.length > 0 && (
            <p className="text-xs">
              Asked a qualified colleague for:{' '}
              {d.referred
                .map((r) => ACTIONS.find((x) => x.id === r)?.label ?? r)
                .join(', ')}
              .
            </p>
          )}
        </section>
        <section aria-label="Teaching">
          <h3 className="font-medium">Teaching</h3>
          <p className="text-xs">{def.debrief.summary}</p>
          <ul className="list-disc pl-5 text-xs">
            {def.debrief.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <dl className="mt-1 text-xs">
            {def.debrief.terms.map((t) => (
              <div key={t.term}>
                <dt className="inline font-medium">{t.term}: </dt>
                <dd className="inline">{t.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <details>
        <summary className="cursor-pointer text-xs font-medium">
          The full timeline
        </summary>
        <ol className="mt-1 text-xs">
          {enc.log.map((e, i) => (
            <li key={i}>
              <span className="text-slate-500">{at(e.t)} </span>
              {e.kind === 'said'
                ? `You: "${e.text}"`
                : e.kind === 'patient'
                  ? `${def.patient.callMe}: ${e.text}`
                  : e.text}
            </li>
          ))}
        </ol>
      </details>
      <Tutor
        def={def}
        enc={enc}
        question={q}
        setQuestion={setQ}
        answer={a}
        setAnswer={setA}
      />
      <p className="text-[11px] text-slate-500">
        Simulation for learning: fictional patient, simplified scoring. Not medical
        advice.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Case progress (the educator's dashboard)
// ---------------------------------------------------------------------------

export function ProgressView({
  state,
  canEdit,
  run,
  player,
}: {
  state: ClinicalState
  canEdit: boolean
  run: Run
  player: Player
}) {
  const d = dashboard(state, player.levelId, player.day)
  const [review, setReview] = useState<string | null>(null)
  const attempts = casesOf(state).attempts
  const reviewing = review ? attempts.find((a) => a.id === review) : null
  if (reviewing)
    return (
      <Debrief
        attempt={reviewing}
        earlier={attempts
          .slice(0, attempts.indexOf(reviewing))
          .filter((a) => a.caseId === reviewing.caseId)}
        onBack={() => setReview(null)}
      />
    )
  const role = roleFor(player.levelId)
  return (
    <div className="space-y-3 p-3 text-sm" data-testid="case-progress">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['Cases for your role', `${d.total}`],
            ['Attempted', `${d.attempted}`],
            ['Passed', `${d.passed}`],
            ['Average (latest attempts)', d.average === null ? '—' : `${d.average}%`],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="rounded border border-slate-200 bg-white px-3 py-1">
            <p className="text-[11px] text-slate-500">{k}</p>
            <p className="font-semibold">{v}</p>
          </div>
        ))}
      </div>

      <section
        className="rounded border border-slate-200 bg-white p-2"
        aria-label="Assigned cases"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Assigned by Grace Mbeki</h3>
          <button
            type="button"
            className={`${secondary} ml-auto`}
            disabled={!canEdit || d.assignments.some((a) => a.status !== 'done')}
            data-testid="grace-assign"
            onClick={() => run((s) => graceAssigns(s, player.levelId, player.day))}
          >
            Ask Grace for cases
          </button>
        </div>
        {d.assignments.length === 0 ? (
          <p className="text-xs text-slate-500">
            Nothing assigned yet. Grace chooses cases from your results, due in two days.
          </p>
        ) : (
          <ul className="text-xs" data-testid="assignments">
            {d.assignments.map((a) => (
              <li key={a.id}>
                <span
                  className={
                    a.status === 'done'
                      ? 'text-emerald-800'
                      : a.status === 'overdue'
                        ? 'text-red-800'
                        : ''
                  }
                >
                  {a.status === 'done' ? '✓' : a.status === 'overdue' ? '!' : '○'}{' '}
                  {a.title} ({a.difficulty}) · due day {a.due}
                  {a.status === 'overdue' && ' (overdue)'}
                </span>
                <span className="block text-slate-500">{a.note}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section
          className="rounded border border-slate-200 bg-white p-2"
          aria-label="Weakest areas"
        >
          <h3 className="font-medium">Weakest areas</h3>
          {d.weakest.length === 0 ? (
            <p className="text-xs text-slate-500">No attempts yet.</p>
          ) : (
            <ul className="text-xs">
              {d.weakest.map((w) => (
                <li key={w.id}>
                  {w.name}: {w.score}%
                </li>
              ))}
            </ul>
          )}
        </section>
        <section
          className="rounded border border-slate-200 bg-white p-2"
          aria-label="Recurring gaps"
        >
          <h3 className="font-medium">Recurring gaps</h3>
          {d.gaps.length === 0 ? (
            <p className="text-xs text-slate-500">Nothing missed more than once.</p>
          ) : (
            <ul className="text-xs" data-testid="gaps">
              {d.gaps.map((g) => (
                <li key={g.action}>
                  {g.label}: in {g.times} attempts
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section
        className="rounded border border-slate-200 bg-white p-2"
        aria-label="Every case"
      >
        <h3 className="font-medium">Every case for a {ROLE_TITLES[role]}</h3>
        <table className="w-full text-xs" data-testid="progress-table">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1">Case</th>
              <th>Level</th>
              <th>First</th>
              <th>Latest</th>
              <th>Best</th>
              <th>Attempts</th>
            </tr>
          </thead>
          <tbody>
            {d.rows.map((r) => (
              <tr key={r.def.id} className="border-t border-slate-100">
                <td className="py-0.5">{r.def.title}</td>
                <td>
                  <Badge d={r.def.difficulty} />
                </td>
                {[r.first, r.latest, r.best].map((a, i) => (
                  <td key={i}>
                    {a ? (
                      a.encounter ? (
                        <button
                          type="button"
                          className="underline"
                          onClick={() => setReview(a.id)}
                        >
                          {a.score}%{a.passed ? ' ✓' : ''}
                        </button>
                      ) : (
                        `${a.score}%${a.passed ? ' ✓' : ''}`
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                ))}
                <td>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-[11px] text-slate-500">
        Everything here comes from your saved attempts in this file.
      </p>
      {casesFor(role).length < CASES.length && (
        <p className="text-[11px] text-slate-500">
          {CASES.length - casesFor(role).length} more cases open up as you are promoted.
        </p>
      )}
    </div>
  )
}
