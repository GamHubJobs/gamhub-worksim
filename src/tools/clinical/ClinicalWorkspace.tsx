/**
 * Ward Systems' screens: the section tabs, and the patient record (the
 * electronic health record). The other sections are in ClinicalSections.tsx.
 */
import { useState } from 'react'
import type { ToolWorkspaceProps } from '../ui'
import {
  AppointmentsView,
  AuditView,
  BedsView,
  LabView,
  PharmacyView,
} from './ClinicalSections'
import { MEDICINES } from './data'
import {
  acknowledgeResult,
  addNote,
  ageOn,
  collectSpecimen,
  escalate,
  escalationFor,
  findPatients,
  latestVitals,
  medicineAlerts,
  openRecord,
  recordDose,
  recordVitals,
  warningScore,
} from './model'
import { NOTE_KINDS, type ClinicalState, type Note, type Patient } from './schema'
import { field, primary, secondary, type Run } from './styles'

const SECTIONS = [
  ['record', 'Patient record'],
  ['clinics', 'Appointments'],
  ['lab', 'Laboratory'],
  ['pharmacy', 'Pharmacy'],
  ['beds', 'Beds and admissions'],
  ['audit', 'Audit log'],
] as const
type SectionId = (typeof SECTIONS)[number][0]

export default function ClinicalWorkspace({
  state,
  readOnly,
  onUpdate,
  lockedSections,
  initialSection,
}: ToolWorkspaceProps<ClinicalState>) {
  const [section, setSection] = useState<SectionId>(
    (SECTIONS.find(([id]) => id === initialSection)?.[0] ?? 'record') as SectionId,
  )
  const [problems, setProblems] = useState<string[]>([])
  const [done, setDone] = useState<string | null>(null)
  const canEdit = !readOnly && !!onUpdate

  const run: Run = (fn) => {
    if (!canEdit) return false
    const result = fn(state)
    setProblems(result.problems)
    if (result.problems.length) {
      setDone(null)
      return false
    }
    onUpdate?.(() => result.state)
    setDone(result.state.audit.at(-1)?.action ?? 'Done')
    return true
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-slate-50 text-slate-900"
      data-testid="ward-systems"
    >
      <div className="flex items-center justify-between gap-2 bg-teal-800 px-3 py-1.5 text-white">
        <p className="text-sm font-semibold">{state.hospital} · Ward Systems</p>
        <p className="text-xs">
          Signed in: {state.user.name} ({state.user.role})
        </p>
      </div>
      <p className="bg-amber-100 px-3 py-1 text-xs text-amber-950" role="note">
        Simulation for learning: every patient, medicine and number is fictional. Nothing
        here is medical advice.
      </p>
      <div
        role="tablist"
        aria-label="Ward Systems sections"
        className="flex flex-wrap gap-1 border-b border-slate-200 bg-white px-2 pt-1"
      >
        {SECTIONS.map(([id, name]) => {
          const locked = lockedSections[id]
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={section === id}
              disabled={!!locked}
              title={locked ? `Unlocks at ${locked}` : undefined}
              onClick={() => {
                setSection(id)
                setProblems([])
                setDone(null)
              }}
              className={`rounded-t px-3 py-1.5 text-sm ${
                section === id
                  ? 'border-b-2 border-teal-700 font-semibold text-teal-900'
                  : 'text-slate-600 hover:text-slate-900'
              } disabled:opacity-40`}
            >
              {name}
              {locked && ' 🔒'}
            </button>
          )
        })}
      </div>
      {(problems.length > 0 || done) && (
        <div
          role={problems.length ? 'alert' : 'status'}
          className={`px-3 py-1.5 text-sm ${problems.length ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-900'}`}
          data-testid="ward-message"
        >
          {problems.length ? problems.join(' ') : `Done: ${done}.`}
        </div>
      )}
      <div
        className="min-h-0 flex-1 overflow-auto"
        tabIndex={0}
        role="region"
        aria-label="Work area"
      >
        {section === 'record' && <RecordView state={state} canEdit={canEdit} run={run} />}
        {section === 'clinics' && (
          <AppointmentsView state={state} canEdit={canEdit} run={run} />
        )}
        {section === 'lab' && <LabView state={state} canEdit={canEdit} run={run} />}
        {section === 'pharmacy' && (
          <PharmacyView state={state} canEdit={canEdit} run={run} />
        )}
        {section === 'beds' && <BedsView state={state} canEdit={canEdit} run={run} />}
        {section === 'audit' && <AuditView state={state} />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// The patient record
// ---------------------------------------------------------------------------

type RecordTab = 'overview' | 'observations' | 'notes' | 'medicines' | 'results'

function RecordView({
  state,
  canEdit,
  run,
}: {
  state: ClinicalState
  canEdit: boolean
  run: Run
}) {
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [asking, setAsking] = useState<Patient | null>(null)
  const [reason, setReason] = useState('')
  const [tab, setTab] = useState<RecordTab>('overview')
  const patient = state.patients.find((p) => p.id === openId)

  function open(p: Patient, why = '') {
    if (!p.careTeam && !why) {
      setAsking(p)
      setReason('')
      return
    }
    if (run((s) => openRecord(s, p.id, why)) || !canEdit) {
      setOpenId(p.id)
      setAsking(null)
      setTab('overview')
    }
  }

  return (
    <div className="flex h-full min-h-0">
      <aside
        className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-2"
        aria-label="Patients"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, hospital number or date of birth"
          aria-label="Find a patient"
          className={`${field} w-full`}
        />
        <ul className="mt-2 space-y-1">
          {findPatients(state, query).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => open(p)}
                aria-current={p.id === openId ? 'true' : undefined}
                className={`w-full rounded px-2 py-1 text-left text-sm ${p.id === openId ? 'bg-teal-100' : 'hover:bg-slate-100'}`}
              >
                <span className="font-medium">{p.name}</span>
                <span className="block text-xs text-slate-600">
                  {p.id} · {p.status === 'admitted' ? `Bed ${p.bed}` : p.status}
                  {!p.careTeam && ' · not on your list'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="min-w-0 flex-1 overflow-y-auto p-3">
        {asking && (
          <form
            className="mb-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm"
            onSubmit={(e) => {
              e.preventDefault()
              open(asking, reason)
            }}
          >
            <p className="font-semibold">{asking.name} is not under your care.</p>
            <p className="mt-1">
              Only open this record if you need to for your work. Your reason is recorded
              and checked.
            </p>
            <label className="mt-2 block">
              Reason
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`${field} mt-1 w-full`}
                aria-label="Reason for opening the record"
              />
            </label>
            <div className="mt-2 flex gap-2">
              <button type="submit" className={primary} disabled={!reason.trim()}>
                Open with this reason
              </button>
              <button type="button" className={secondary} onClick={() => setAsking(null)}>
                Don’t open it
              </button>
            </div>
          </form>
        )}
        {!patient ? (
          <p className="text-sm text-slate-600">Choose a patient to open their record.</p>
        ) : (
          <>
            <Banner state={state} patient={patient} />
            <div role="tablist" aria-label="Record" className="mt-3 flex flex-wrap gap-1">
              {(
                [
                  ['overview', 'Overview'],
                  ['observations', 'Observations'],
                  ['notes', 'Notes'],
                  ['medicines', 'Medicines chart'],
                  ['results', 'Tests and results'],
                ] as const
              ).map(([id, name]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`rounded px-3 py-1 text-sm ${tab === id ? 'bg-teal-700 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'}`}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="mt-3">
              {tab === 'overview' && <Overview state={state} patient={patient} />}
              {tab === 'observations' && (
                <Observations
                  state={state}
                  patient={patient}
                  canEdit={canEdit}
                  run={run}
                />
              )}
              {tab === 'notes' && (
                <Notes state={state} patient={patient} canEdit={canEdit} run={run} />
              )}
              {tab === 'medicines' && (
                <MedicinesChart
                  state={state}
                  patient={patient}
                  canEdit={canEdit}
                  run={run}
                />
              )}
              {tab === 'results' && (
                <Results state={state} patient={patient} canEdit={canEdit} run={run} />
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function Banner({ state, patient }: { state: ClinicalState; patient: Patient }) {
  return (
    <div
      className="rounded border border-slate-300 bg-white p-3"
      data-testid="patient-banner"
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold">{patient.name}</h2>
        <span className="text-sm">
          Born {patient.dob} ({ageOn(patient.dob)} years) · {patient.sex}
        </span>
        <span className="font-mono text-sm">{patient.id}</span>
        <span className="text-sm">
          {patient.bed
            ? `${state.beds.find((b) => b.id === patient.bed)?.ward ?? ''}, bed ${patient.bed}`
            : patient.status}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        {patient.allergies.length ? (
          patient.allergies.map((a) => (
            <span
              key={a.substance}
              className="rounded bg-red-700 px-2 py-0.5 font-semibold text-white"
            >
              ALLERGY: {a.substance} ({a.reaction})
            </span>
          ))
        ) : (
          <span className="rounded bg-slate-100 px-2 py-0.5">No known allergies</span>
        )}
        {patient.alerts.map((a) => (
          <span key={a} className="rounded bg-amber-200 px-2 py-0.5 text-amber-950">
            {a}
          </span>
        ))}
      </div>
    </div>
  )
}

function Overview({ state, patient }: { state: ClinicalState; patient: Patient }) {
  const v = latestVitals(state, patient.id)
  const lastNote = state.notes.filter((n) => n.patientId === patient.id).at(-1)
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded border border-slate-200 bg-white p-3 text-sm">
        <h3 className="font-semibold">Why they are here</h3>
        <p className="mt-1">{patient.reason || '—'}</p>
      </div>
      <div className="rounded border border-slate-200 bg-white p-3 text-sm">
        <h3 className="font-semibold">Latest observations</h3>
        {v ? (
          <p className="mt-1">
            {v.at}: score <strong>{v.score}</strong> (by {v.by})
          </p>
        ) : (
          <p className="mt-1">None recorded.</p>
        )}
      </div>
      {lastNote && (
        <div className="rounded border border-slate-200 bg-white p-3 text-sm md:col-span-2">
          <h3 className="font-semibold">
            Latest note: {NOTE_KINDS[lastNote.kind]} ({lastNote.at}, {lastNote.by})
          </h3>
          <p className="mt-1 whitespace-pre-wrap">{lastNote.text}</p>
        </div>
      )}
    </div>
  )
}

function Observations({
  state,
  patient,
  canEdit,
  run,
}: {
  state: ClinicalState
  patient: Patient
  canEdit: boolean
  run: Run
}) {
  const [form, setForm] = useState({
    resp: '',
    spo2: '',
    temp: '',
    sys: '',
    dia: '',
    pulse: '',
  })
  const [alert, setAlert] = useState(true)
  const list = state.vitals.filter((v) => v.patientId === patient.id)
  const nums = Object.fromEntries(
    Object.entries(form).map(([k, v]) => [k, Number(v)]),
  ) as Record<keyof typeof form, number>
  const complete = Object.values(form).every(
    (v) => v.trim() !== '' && !Number.isNaN(Number(v)),
  )
  const preview = complete ? warningScore({ ...nums, alert }) : null
  const labels: Array<[keyof typeof form, string]> = [
    ['resp', 'Breathing (per minute)'],
    ['spo2', 'Oxygen saturation (%)'],
    ['temp', 'Temperature (°C)'],
    ['sys', 'Blood pressure, upper'],
    ['dia', 'Blood pressure, lower'],
    ['pulse', 'Pulse (per minute)'],
  ]
  return (
    <div className="space-y-3">
      {canEdit && (
        <form
          className="rounded border border-slate-200 bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (complete && run((s) => recordVitals(s, patient.id, { ...nums, alert })))
              setForm({ resp: '', spo2: '', temp: '', sys: '', dia: '', pulse: '' })
          }}
        >
          <h3 className="text-sm font-semibold">Record observations</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
            {labels.map(([key, label]) => (
              <label key={key} className="text-xs text-slate-700">
                {label}
                <input
                  inputMode="decimal"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className={`${field} mt-0.5 w-full`}
                />
              </label>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={alert}
              onChange={(e) => setAlert(e.target.checked)}
            />
            Alert (awake and responding normally, no new confusion)
          </label>
          {preview && (
            <p className="mt-2 text-sm" data-testid="score-preview">
              Score <strong>{preview.score}</strong>:{' '}
              {escalationFor(preview.score, preview.anyThree).action}
            </p>
          )}
          <button type="submit" className={`${primary} mt-2`} disabled={!complete}>
            Save observations
          </button>
        </form>
      )}
      <table className="w-full rounded border border-slate-200 bg-white text-sm">
        <thead className="bg-slate-100 text-left text-xs">
          <tr>
            {[
              'Time',
              'Breathing',
              'O₂ %',
              'Temp',
              'BP',
              'Pulse',
              'Alert',
              'Score',
              'By',
            ].map((h) => (
              <th key={h} className="px-2 py-1">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((v) => (
            <tr key={v.id} className="border-t border-slate-100">
              <td className="px-2 py-1">{v.at}</td>
              <td className="px-2 py-1">{v.resp}</td>
              <td className="px-2 py-1">{v.spo2}</td>
              <td className="px-2 py-1">{v.temp}</td>
              <td className="px-2 py-1">
                {v.sys}/{v.dia}
              </td>
              <td className="px-2 py-1">{v.pulse}</td>
              <td className="px-2 py-1">{v.alert ? 'Yes' : 'No'}</td>
              <td
                className={`px-2 py-1 font-semibold ${v.score >= 5 ? 'text-red-700' : v.score >= 1 ? 'text-amber-800' : ''}`}
              >
                {v.score}
              </td>
              <td className="px-2 py-1">{v.by}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Notes({
  state,
  patient,
  canEdit,
  run,
}: {
  state: ClinicalState
  patient: Patient
  canEdit: boolean
  run: Run
}) {
  const [kind, setKind] = useState<Note['kind']>('nursing')
  const [text, setText] = useState('')
  const [to, setTo] = useState('')
  const [sbar, setSbar] = useState({
    situation: '',
    background: '',
    assessment: '',
    recommendation: '',
  })
  const notes = state.notes.filter((n) => n.patientId === patient.id)
  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="rounded border border-slate-200 bg-white p-3">
          <label className="text-sm">
            Kind of note{' '}
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as Note['kind'])}
              className={field}
              aria-label="Kind of note"
            >
              {Object.entries(NOTE_KINDS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {kind === 'escalation' ? (
            <form
              className="mt-2 grid gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (run((s) => escalate(s, patient.id, to, sbar))) {
                  setSbar({
                    situation: '',
                    background: '',
                    assessment: '',
                    recommendation: '',
                  })
                  setTo('')
                }
              }}
            >
              <label className="text-xs">
                Escalated to (name and role)
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className={`${field} mt-0.5 w-full`}
                />
              </label>
              {(
                [
                  ['situation', 'Situation: what is happening now'],
                  ['background', 'Background: why they are here'],
                  ['assessment', 'Assessment: what you found'],
                  ['recommendation', 'Recommendation: what you need'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-xs">
                  {label}
                  <textarea
                    rows={2}
                    value={sbar[key]}
                    onChange={(e) => setSbar((s) => ({ ...s, [key]: e.target.value }))}
                    className={`${field} mt-0.5 w-full`}
                  />
                </label>
              ))}
              <button type="submit" className={primary}>
                Record the escalation
              </button>
            </form>
          ) : (
            <form
              className="mt-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (run((s) => addNote(s, patient.id, kind, text, true))) setText('')
              }}
            >
              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-label="Note"
                className={`${field} w-full`}
              />
              <div className="mt-1 flex gap-2">
                <button type="submit" className={primary}>
                  Sign the note
                </button>
                <button
                  type="button"
                  className={secondary}
                  onClick={() =>
                    run((s) => addNote(s, patient.id, kind, text, false)) && setText('')
                  }
                >
                  Save as draft
                </button>
              </div>
            </form>
          )}
        </div>
      )}
      <ol className="space-y-2">
        {[...notes].reverse().map((n) => (
          <li key={n.id} className="rounded border border-slate-200 bg-white p-3 text-sm">
            <p className="text-xs text-slate-600">
              {NOTE_KINDS[n.kind]} · {n.at} · {n.by}{' '}
              {n.signed ? '· signed' : '· DRAFT (not signed)'}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{n.text}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

function MedicinesChart({
  state,
  patient,
  canEdit,
  run,
}: {
  state: ClinicalState
  patient: Patient
  canEdit: boolean
  run: Run
}) {
  const orders = state.meds.filter((m) => m.patientId === patient.id)
  const [checks, setChecks] = useState<
    Record<string, { identity: boolean; allergies: boolean; reason: string }>
  >({})
  if (!orders.length)
    return <p className="text-sm text-slate-600">No medicines are prescribed.</p>
  return (
    <ul className="space-y-2">
      {orders.map((m) => {
        const c = checks[m.id] ?? { identity: false, allergies: false, reason: '' }
        const set = (change: Partial<typeof c>) =>
          setChecks((all) => ({ ...all, [m.id]: { ...c, ...change } }))
        const alerts = medicineAlerts(state, m)
        return (
          <li
            key={m.id}
            className="rounded border border-slate-200 bg-white p-3 text-sm"
            data-testid={`med-${m.id}`}
          >
            <p>
              <strong>{m.drug}</strong> ({MEDICINES[m.drug]?.use ?? 'unknown'}) {m.dose},{' '}
              {m.route}, {m.frequency}. Next due {m.due}.
            </p>
            <p className="text-xs text-slate-600">
              {m.id} · prescribed by {m.prescriber} · pharmacy: {m.status}
              {m.query && ` · query: ${m.query}`}
            </p>
            {alerts.map((a) => (
              <p key={a} className="mt-1 font-semibold text-red-700">
                {a}
              </p>
            ))}
            {m.administrations.map((a, i) => (
              <p key={i} className="mt-1 text-xs">
                {a.at}: {a.outcome === 'given' ? 'Given' : `Not given (${a.reason})`} by{' '}
                {a.by}
              </p>
            ))}
            {canEdit && (
              <div className="mt-2 space-y-1 rounded bg-slate-50 p-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={c.identity}
                    onChange={(e) => set({ identity: e.target.checked })}
                  />
                  I asked the patient’s name and date of birth and checked the wristband
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={c.allergies}
                    onChange={(e) => set({ allergies: e.target.checked })}
                  />
                  I checked their allergies against this medicine
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={primary}
                    onClick={() => run((s) => recordDose(s, m.id, 'given', c))}
                  >
                    Record as given
                  </button>
                  <input
                    value={c.reason}
                    onChange={(e) => set({ reason: e.target.value })}
                    placeholder="Why not given"
                    aria-label={`Why ${m.drug} was not given`}
                    className={field}
                  />
                  <button
                    type="button"
                    className={secondary}
                    onClick={() =>
                      run((s) => recordDose(s, m.id, 'withheld', c, c.reason))
                    }
                  >
                    Record as not given
                  </button>
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Results({
  state,
  patient,
  canEdit,
  run,
}: {
  state: ClinicalState
  patient: Patient
  canEdit: boolean
  run: Run
}) {
  const labs = state.labs.filter((l) => l.patientId === patient.id)
  const [label, setLabel] = useState({ name: '', dob: '' })
  const [called, setCalled] = useState('')
  if (!labs.length) return <p className="text-sm text-slate-600">No tests requested.</p>
  return (
    <ul className="space-y-2">
      {labs.map((l) => (
        <li
          key={l.id}
          className="rounded border border-slate-200 bg-white p-3 text-sm"
          data-testid={`lab-${l.id}`}
        >
          <p>
            <strong>{l.test}</strong> ({l.specimen}) · {l.id} · requested by {l.orderedBy}{' '}
            · <em>{l.status}</em>
          </p>
          {l.rejectReason && <p className="text-red-700">Rejected: {l.rejectReason}</p>}
          {l.result && (
            <p className={l.result.flag === 'normal' ? '' : 'font-semibold text-red-700'}>
              Result: {l.result.value} {l.result.unit} (range {l.result.low}–
              {l.result.high}) {l.result.flag.toUpperCase()}
              {l.acknowledged &&
                ` · acknowledged${l.calledTo ? `, phoned to ${l.calledTo}` : ''}`}
            </p>
          )}
          {canEdit && l.status === 'ordered' && (
            <form
              className="mt-2 flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                run((s) => collectSpecimen(s, l.id, label))
              }}
            >
              <span className="w-full text-xs text-slate-600">
                Label the specimen at the bedside, from what the patient tells you:
              </span>
              <label className="text-xs">
                Name on the label
                <input
                  value={label.name}
                  onChange={(e) => setLabel((x) => ({ ...x, name: e.target.value }))}
                  className={`${field} mt-0.5 block`}
                />
              </label>
              <label className="text-xs">
                Date of birth (YYYY-MM-DD)
                <input
                  value={label.dob}
                  onChange={(e) => setLabel((x) => ({ ...x, dob: e.target.value }))}
                  className={`${field} mt-0.5 block`}
                />
              </label>
              <button type="submit" className={primary}>
                Collect and label
              </button>
            </form>
          )}
          {canEdit && l.result && !l.acknowledged && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {l.result.flag === 'critical' && (
                <input
                  value={called}
                  onChange={(e) => setCalled(e.target.value)}
                  placeholder="Who you phoned (name, role)"
                  aria-label="Phoned to"
                  className={field}
                />
              )}
              <button
                type="button"
                className={primary}
                onClick={() => run((s) => acknowledgeResult(s, l.id, called))}
              >
                Acknowledge
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
