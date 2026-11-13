/** Ward Systems: appointments, laboratory, pharmacy, beds and the audit log. */
import { useState } from 'react'
import {
  admitToBed,
  bookAppointment,
  discharge,
  dispenseMedicine,
  enterResult,
  labelMatches,
  markBedClean,
  medicineAlerts,
  patientById,
  queryMedicine,
  receiveSpecimen,
  rejectSpecimen,
  repeatRequest,
  setAppointmentStatus,
  verifyMedicine,
} from './model'
import type { Appointment, ClinicalState } from './schema'
import { field, primary, secondary, type Run } from './styles'

interface ViewProps {
  state: ClinicalState
  canEdit: boolean
  run: Run
}

const nameOf = (state: ClinicalState, id: string) => patientById(state, id)?.name ?? id

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

const CLINICS: Record<string, string[]> = {
  'Diabetes clinic': ['Dr Hana Ito'],
  'Respiratory clinic': ['Dr Felix Moreau'],
  'Fracture clinic': ['Dr Amara Osei'],
}

export function AppointmentsView({ state, canEdit, run }: ViewProps) {
  const [form, setForm] = useState({
    patientId: '',
    clinic: 'Diabetes clinic',
    clinician: 'Dr Hana Ito',
    date: '2026-03-02',
    time: '11:00',
  })
  const sorted = [...state.appointments].sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
  )
  const actions: Array<[Appointment['status'], string]> = [
    ['arrived', 'Arrived'],
    ['seen', 'Seen'],
    ['cancelled', 'Cancel'],
    ['no-show', 'Did not attend'],
  ]
  return (
    <div className="space-y-3 p-3">
      <table
        className="w-full rounded border border-slate-200 bg-white text-sm"
        data-testid="clinic-list"
      >
        <thead className="bg-slate-100 text-left text-xs">
          <tr>
            {['Date', 'Time', 'Patient', 'Clinic', 'Clinician', 'Status', ''].map((h) => (
              <th key={h} className="px-2 py-1">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => (
            <tr key={a.id} className="border-t border-slate-100">
              <td className="px-2 py-1">{a.date}</td>
              <td className="px-2 py-1">{a.time}</td>
              <td className="px-2 py-1">{nameOf(state, a.patientId)}</td>
              <td className="px-2 py-1">{a.clinic}</td>
              <td className="px-2 py-1">{a.clinician}</td>
              <td className="px-2 py-1">{a.status}</td>
              <td className="space-x-1 px-2 py-1 whitespace-nowrap">
                {canEdit &&
                  actions.map(([status, label]) => (
                    <button
                      key={status}
                      type="button"
                      className="rounded px-1.5 text-xs text-teal-800 underline hover:bg-teal-50"
                      onClick={() => run((s) => setAppointmentStatus(s, a.id, status))}
                      aria-label={`${label}: ${nameOf(state, a.patientId)} at ${a.time}`}
                    >
                      {label}
                    </button>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {canEdit && (
        <form
          className="flex flex-wrap items-end gap-2 rounded border border-slate-200 bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault()
            run((s) => bookAppointment(s, form))
          }}
        >
          <h3 className="w-full text-sm font-semibold">Book an appointment</h3>
          <label className="text-xs">
            Patient
            <select
              value={form.patientId}
              onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
              className={`${field} mt-0.5 block`}
            >
              <option value="">Choose…</option>
              {state.patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Clinic
            <select
              value={form.clinic}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  clinic: e.target.value,
                  clinician: CLINICS[e.target.value][0],
                }))
              }
              className={`${field} mt-0.5 block`}
            >
              {Object.keys(CLINICS).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Date
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className={`${field} mt-0.5 block`}
            />
          </label>
          <label className="text-xs">
            Time
            <input
              type="time"
              step={900}
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              className={`${field} mt-0.5 block`}
            />
          </label>
          <button type="submit" className={primary}>
            Book
          </button>
        </form>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Laboratory
// ---------------------------------------------------------------------------

export function LabView({ state, canEdit, run }: ViewProps) {
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [values, setValues] = useState<Record<string, string>>({})
  return (
    <div className="space-y-2 p-3">
      <p className="text-sm text-slate-700">
        The laboratory worklist. Check each specimen’s label against the request before
        testing it.
      </p>
      {state.labs.map((l) => {
        const patient = patientById(state, l.patientId)
        const matches = labelMatches(state, l)
        return (
          <div
            key={l.id}
            className="rounded border border-slate-200 bg-white p-3 text-sm"
            data-testid={`worklist-${l.id}`}
          >
            <p>
              <strong>{l.id}</strong> · {l.test} ({l.specimen}) · <em>{l.status}</em>
            </p>
            <div className="mt-1 grid gap-2 md:grid-cols-2">
              <p className="rounded bg-slate-50 p-2">
                Request: {patient?.name} · born {patient?.dob}
              </p>
              <p
                className={`rounded p-2 ${l.label ? (matches ? 'bg-emerald-50' : 'bg-red-50') : 'bg-slate-50'}`}
              >
                Label:{' '}
                {l.label ? `${l.label.name} · born ${l.label.dob}` : 'not collected yet'}
              </p>
            </div>
            {l.rejectReason && (
              <p className="mt-1 text-red-700">Rejected: {l.rejectReason}</p>
            )}
            {l.result && (
              <p className="mt-1">
                Result: {l.result.value} {l.result.unit} · {l.result.flag}
              </p>
            )}
            {canEdit && l.status === 'collected' && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={primary}
                  onClick={() => run((s) => receiveSpecimen(s, l.id))}
                >
                  Receive for testing
                </button>
                <input
                  value={reasons[l.id] ?? ''}
                  onChange={(e) => setReasons((r) => ({ ...r, [l.id]: e.target.value }))}
                  placeholder="Reason for rejecting"
                  aria-label={`Reason for rejecting ${l.id}`}
                  className={field}
                />
                <button
                  type="button"
                  className={secondary}
                  onClick={() => run((s) => rejectSpecimen(s, l.id, reasons[l.id] ?? ''))}
                >
                  Reject
                </button>
              </div>
            )}
            {canEdit && l.status === 'received' && (
              <form
                className="mt-2 flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  run((s) => enterResult(s, l.id, Number(values[l.id])))
                }}
              >
                <input
                  inputMode="decimal"
                  value={values[l.id] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [l.id]: e.target.value }))}
                  placeholder="Analyser value"
                  aria-label={`Result for ${l.id}`}
                  className={field}
                />
                <button type="submit" className={primary} disabled={!values[l.id]}>
                  Enter result
                </button>
              </form>
            )}
            {canEdit &&
              l.status === 'rejected' &&
              !state.labs.some((x) => x.id === `${l.id}-R`) && (
                <button
                  type="button"
                  className={`${secondary} mt-2`}
                  onClick={() => run((s) => repeatRequest(s, l.id))}
                >
                  Request a new specimen
                </button>
              )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pharmacy
// ---------------------------------------------------------------------------

export function PharmacyView({ state, canEdit, run }: ViewProps) {
  const [queries, setQueries] = useState<Record<string, string>>({})
  const waiting = state.meds.filter(
    (m) => m.status === 'awaiting-verification' || m.status === 'verified',
  )
  const done = state.meds.filter(
    (m) => m.status === 'queried' || m.status === 'dispensed',
  )
  return (
    <div className="space-y-2 p-3">
      <p className="text-sm text-slate-700">
        Verify each prescription before it is dispensed. Read the safety alerts: a
        prescription with an alert is queried with the prescriber, not verified.
      </p>
      {waiting.length === 0 && (
        <p className="text-sm text-slate-600">Nothing is waiting for pharmacy.</p>
      )}
      {waiting.map((m) => {
        const alerts = medicineAlerts(state, m)
        return (
          <div
            key={m.id}
            className="rounded border border-slate-200 bg-white p-3 text-sm"
            data-testid={`rx-${m.id}`}
          >
            <p>
              <strong>{m.id}</strong> · {nameOf(state, m.patientId)} · {m.drug} {m.dose},{' '}
              {m.route}, {m.frequency} · by {m.prescriber}
            </p>
            <p className="text-xs text-slate-600">Status: {m.status}</p>
            {alerts.length ? (
              alerts.map((a) => (
                <p key={a} className="mt-1 font-semibold text-red-700">
                  {a}
                </p>
              ))
            ) : (
              <p className="mt-1 text-emerald-800">No safety alerts.</p>
            )}
            {canEdit && m.status === 'awaiting-verification' && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={primary}
                  onClick={() => run((s) => verifyMedicine(s, m.id))}
                >
                  Verify
                </button>
                <input
                  value={queries[m.id] ?? ''}
                  onChange={(e) => setQueries((q) => ({ ...q, [m.id]: e.target.value }))}
                  placeholder="Your question for the prescriber"
                  aria-label={`Query about ${m.id}`}
                  className={`${field} min-w-64 flex-1`}
                />
                <button
                  type="button"
                  className={secondary}
                  onClick={() => run((s) => queryMedicine(s, m.id, queries[m.id] ?? ''))}
                >
                  Query
                </button>
              </div>
            )}
            {canEdit && m.status === 'verified' && (
              <button
                type="button"
                className={`${primary} mt-2`}
                onClick={() => run((s) => dispenseMedicine(s, m.id))}
              >
                Dispense to the ward
              </button>
            )}
          </div>
        )
      })}
      {done.length > 0 && (
        <details className="rounded border border-slate-200 bg-white p-3 text-sm">
          <summary>Dispensed and queried ({done.length})</summary>
          <ul className="mt-1 space-y-1">
            {done.map((m) => (
              <li key={m.id}>
                {m.id} · {nameOf(state, m.patientId)} · {m.drug}: {m.status}
                {m.query && ` (“${m.query}”)`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Beds and admissions
// ---------------------------------------------------------------------------

export function BedsView({ state, canEdit, run }: ViewProps) {
  const [patientId, setPatientId] = useState('')
  const [bedId, setBedId] = useState('')
  const wards = [...new Set(state.beds.map((b) => b.ward))]
  return (
    <div className="space-y-3 p-3">
      {wards.map((ward) => (
        <section key={ward} aria-label={ward}>
          <h3 className="text-sm font-semibold">{ward}</h3>
          <ul className="mt-1 grid grid-cols-2 gap-2 md:grid-cols-3">
            {state.beds
              .filter((b) => b.ward === ward)
              .map((b) => (
                <li
                  key={b.id}
                  className={`rounded border p-2 text-sm ${b.patientId ? 'border-teal-300 bg-teal-50' : b.clean ? 'border-slate-200 bg-white' : 'border-amber-300 bg-amber-50'}`}
                  data-testid={`bed-${b.id}`}
                >
                  <p className="font-semibold">Bed {b.id}</p>
                  <p>
                    {b.patientId
                      ? nameOf(state, b.patientId)
                      : b.clean
                        ? 'Empty, clean'
                        : 'Empty, needs cleaning'}
                  </p>
                  {canEdit && !b.patientId && !b.clean && (
                    <button
                      type="button"
                      className={`${secondary} mt-1`}
                      onClick={() => run((s) => markBedClean(s, b.id))}
                    >
                      Mark cleaned
                    </button>
                  )}
                  {canEdit && b.patientId && b.ward === 'Ward 4' && (
                    <button
                      type="button"
                      className={`${secondary} mt-1`}
                      onClick={() => run((s) => discharge(s, b.patientId as string))}
                      aria-label={`Discharge ${nameOf(state, b.patientId)}`}
                    >
                      Discharge
                    </button>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
      {canEdit && (
        <form
          className="flex flex-wrap items-end gap-2 rounded border border-slate-200 bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault()
            run((s) => admitToBed(s, patientId, bedId))
          }}
        >
          <h3 className="w-full text-sm font-semibold">Admit or move a patient</h3>
          <label className="text-xs">
            Patient
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className={`${field} mt-0.5 block`}
            >
              <option value="">Choose…</option>
              {state.patients
                .filter((p) => p.careTeam && p.status !== 'discharged')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.status === 'admitted' ? `bed ${p.bed}` : p.status})
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs">
            Bed
            <select
              value={bedId}
              onChange={(e) => setBedId(e.target.value)}
              className={`${field} mt-0.5 block`}
            >
              <option value="">Choose…</option>
              {state.beds
                .filter((b) => b.ward === 'Ward 4')
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.id}
                    {b.patientId ? ' (taken)' : b.clean ? '' : ' (needs cleaning)'}
                  </option>
                ))}
            </select>
          </label>
          <button type="submit" className={primary}>
            Admit / move
          </button>
        </form>
      )}
    </div>
  )
}

export function AuditView({ state }: { state: ClinicalState }) {
  return (
    <div className="p-3">
      <p className="text-sm text-slate-700">
        Every action in Ward Systems is recorded with the time and who did it. Records are
        checked regularly.
      </p>
      <table
        className="mt-2 w-full rounded border border-slate-200 bg-white text-sm"
        data-testid="audit-log"
      >
        <thead className="bg-slate-100 text-left text-xs">
          <tr>
            {['Time', 'Action', 'Patient', 'Detail'].map((h) => (
              <th key={h} className="px-2 py-1">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...state.audit].reverse().map((a, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="px-2 py-1">{a.at}</td>
              <td className="px-2 py-1">{a.action}</td>
              <td className="px-2 py-1">
                {a.patientId ? nameOf(state, a.patientId) : ''}
              </td>
              <td className="px-2 py-1">{a.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
