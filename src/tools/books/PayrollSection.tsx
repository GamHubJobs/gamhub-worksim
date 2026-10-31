/** Books: employees, monthly pay runs and payslips. */
import { useState } from 'react'
import { formatMoney } from '../checks'
import { Badge, Heading, NumberInput, Problems } from './inputs'
import { cell, numeric, POST, PRIMARY, SECONDARY } from './styles'
import {
  createPayRun,
  deleteDraftPayRun,
  payRunTotals,
  postPayRun,
  recalculatePayRun,
  saveEmployee,
} from './payroll'
import type { BooksState, Employee, PayRun } from './schema'

type Update = (change: (s: BooksState) => BooksState) => void

export function PayrollSection({
  state,
  editable,
  update,
}: {
  state: BooksState
  editable: boolean
  update: Update
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const run = state.payRuns.find((r) => r.id === selected) ?? null
  const rules = state.settings.payroll
  return (
    <div data-testid="books-payroll">
      <Heading title="Payroll" />
      <p className="mb-4 rounded-md bg-slate-100 p-3 text-xs text-slate-600">
        Simplified UK rules: tax-free allowance {formatMoney(rules.personalAllowance)} a
        year, income tax {Math.round(rules.basicRate * 100)}% above it, employee National
        Insurance {Math.round(rules.niRate * 100)}% above{' '}
        {formatMoney(rules.niThresholdMonthly)} a month, and each employee’s pension
        contribution. Real payroll has more bands and rules.
      </p>

      <Employees state={state} editable={editable} update={update} />

      <h3 className="mt-6 mb-2 font-semibold text-slate-900">Pay runs</h3>
      {editable && <NewPayRun state={state} update={update} onCreated={setSelected} />}
      {run && (
        <PayRunView
          key={run.id}
          state={state}
          run={run}
          editable={editable}
          update={update}
          onClose={() => setSelected(null)}
        />
      )}
      {state.payRuns.length === 0 ? (
        <p className="text-sm text-slate-500">No pay runs yet.</p>
      ) : (
        <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
          <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
            <tr>
              <th className={cell}>Month</th>
              <th className={cell}>Pay date</th>
              <th className={`${cell} text-right`}>Gross</th>
              <th className={`${cell} text-right`}>Net pay</th>
              <th className={cell}>Status</th>
            </tr>
          </thead>
          <tbody>
            {[...state.payRuns]
              .sort((a, b) => b.period.localeCompare(a.period))
              .map((r) => {
                const t = payRunTotals(r)
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r.id)}
                    className="cursor-pointer border-t border-slate-100 hover:bg-indigo-50"
                    data-testid="payrun-row"
                  >
                    <td className={cell}>{r.period}</td>
                    <td className={cell}>{r.payDate}</td>
                    <td className={numeric}>{formatMoney(t.gross)}</td>
                    <td className={numeric}>{formatMoney(t.net)}</td>
                    <td className={cell}>
                      <Badge tone={r.status === 'posted' ? 'green' : 'amber'}>
                        {r.status === 'posted' ? 'Posted' : 'Draft'}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Employees({
  state,
  editable,
  update,
}: {
  state: BooksState
  editable: boolean
  update: Update
}) {
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Employees</h3>
        {editable && editing === null && (
          <button type="button" onClick={() => setEditing('new')} className={SECONDARY}>
            Add employee
          </button>
        )}
      </div>
      {editing === 'new' && (
        <EmployeeForm state={state} update={update} onDone={() => setEditing(null)} />
      )}
      <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
        <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
          <tr>
            <th className={cell}>Name</th>
            <th className={cell}>Role</th>
            <th className={`${cell} text-right`}>Annual salary</th>
            <th className={`${cell} text-right`}>Pension</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {state.employees.map((e) =>
            editing === e.id ? (
              <tr key={e.id}>
                <td colSpan={5} className="p-2">
                  <EmployeeForm
                    state={state}
                    employee={e}
                    update={update}
                    onDone={() => setEditing(null)}
                  />
                </td>
              </tr>
            ) : (
              <tr
                key={e.id}
                className="border-t border-slate-100"
                data-testid="employee-row"
              >
                <td className={cell}>{e.name}</td>
                <td className={cell}>{e.role}</td>
                <td className={numeric}>{formatMoney(e.annualSalary)}</td>
                <td className={numeric}>{(e.pensionRate * 100).toFixed(1)}%</td>
                <td className={`${cell} text-right`}>
                  {editable && editing === null && (
                    <button
                      type="button"
                      onClick={() => setEditing(e.id)}
                      className="text-xs text-indigo-700 underline"
                      aria-label={`Edit ${e.name}`}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </section>
  )
}

function EmployeeForm({
  state,
  employee,
  update,
  onDone,
}: {
  state: BooksState
  employee?: Employee
  update: Update
  onDone: () => void
}) {
  const [name, setName] = useState(employee?.name ?? '')
  const [role, setRole] = useState(employee?.role ?? '')
  const [salary, setSalary] = useState(employee?.annualSalary ?? 0)
  const [pension, setPension] = useState((employee?.pensionRate ?? 0.05) * 100)
  const [problems, setProblems] = useState<string[]>([])
  const value = {
    ...(employee ? { id: employee.id } : {}),
    name,
    role,
    annualSalary: salary,
    pensionRate: Math.round(pension * 10) / 1000,
  }
  return (
    <form
      className="mb-3 flex flex-wrap items-end gap-2 rounded-md border border-indigo-200 bg-white p-3 text-sm"
      data-testid="employee-form"
      onSubmit={(e) => {
        e.preventDefault()
        const result = saveEmployee(state, value)
        if (result.problems.length > 0) return setProblems(result.problems)
        update((s) => saveEmployee(s, value).state)
        onDone()
      }}
    >
      <label className="flex flex-col gap-1">
        Name
        <input
          aria-label="Employee name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        Role
        <input
          aria-label="Employee role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        Annual salary (£)
        <NumberInput
          key={`s${salary}`}
          label="Annual salary"
          value={salary}
          onCommit={setSalary}
          className="w-28"
        />
      </label>
      <label className="flex flex-col gap-1">
        Pension (%)
        <NumberInput
          key={`p${pension}`}
          label="Pension contribution"
          value={pension}
          decimals={1}
          onCommit={setPension}
          className="w-20"
        />
      </label>
      <button type="submit" className={PRIMARY}>
        Save
      </button>
      <button type="button" onClick={onDone} className={SECONDARY}>
        Cancel
      </button>
      <div className="w-full">
        <Problems problems={problems} />
      </div>
    </form>
  )
}

function NewPayRun({
  state,
  update,
  onCreated,
}: {
  state: BooksState
  update: Update
  onCreated: (id: string) => void
}) {
  const [period, setPeriod] = useState(state.settings.today.slice(0, 7))
  const [payDate, setPayDate] = useState(state.settings.today)
  const [problems, setProblems] = useState<string[]>([])
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-1">
          Month
          <input
            type="month"
            aria-label="Pay run month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-1">
          Pay date
          <input
            type="date"
            aria-label="Pay date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <button
          type="button"
          className={PRIMARY}
          onClick={() => {
            const result = createPayRun(state, period, payDate)
            if (result.problems.length > 0) return setProblems(result.problems)
            setProblems([])
            update((s) => createPayRun(s, period, payDate).state)
            onCreated(result.id)
          }}
        >
          Create pay run
        </button>
      </div>
      <Problems problems={problems} />
    </div>
  )
}

function PayRunView({
  state,
  run,
  editable,
  update,
  onClose,
}: {
  state: BooksState
  run: PayRun
  editable: boolean
  update: Update
  onClose: () => void
}) {
  const t = payRunTotals(run)
  const draft = run.status === 'draft'
  const name = (id: string) => state.employees.find((e) => e.id === id)?.name ?? id
  return (
    <section
      className="mb-4 rounded-xl border border-indigo-200 bg-white p-4 shadow-sm"
      data-testid="payrun"
    >
      <div className="flex items-center gap-3">
        <h3 className="font-semibold text-slate-900">Pay run {run.period}</h3>
        <Badge tone={draft ? 'amber' : 'green'}>{draft ? 'Draft' : 'Posted'}</Badge>
        <span className="text-sm text-slate-500">paid {run.payDate}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          Close
        </button>
      </div>
      <table className="mt-3 w-full text-sm">
        <thead className="text-left text-xs text-slate-500 uppercase">
          <tr>
            <th className={cell}>Employee</th>
            <th className={`${cell} text-right`}>Gross</th>
            <th className={`${cell} text-right`}>Income tax</th>
            <th className={`${cell} text-right`}>NI</th>
            <th className={`${cell} text-right`}>Pension</th>
            <th className={`${cell} text-right`}>Net pay</th>
          </tr>
        </thead>
        <tbody>
          {run.payslips.map((p) => (
            <tr
              key={p.employee}
              className="border-t border-slate-100"
              data-testid="payslip"
            >
              <td className={cell}>{name(p.employee)}</td>
              <td className={numeric}>{formatMoney(p.gross)}</td>
              <td className={numeric}>{formatMoney(p.tax)}</td>
              <td className={numeric}>{formatMoney(p.ni)}</td>
              <td className={numeric}>{formatMoney(p.pension)}</td>
              <td className={`${numeric} font-medium`}>{formatMoney(p.net)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr
            className="border-t-2 border-slate-200 font-semibold"
            data-testid="payrun-totals"
          >
            <td className={cell}>Total</td>
            <td className={numeric}>{formatMoney(t.gross)}</td>
            <td className={numeric}>{formatMoney(t.tax)}</td>
            <td className={numeric}>{formatMoney(t.ni)}</td>
            <td className={numeric}>{formatMoney(t.pension)}</td>
            <td className={numeric}>{formatMoney(t.net)}</td>
          </tr>
        </tfoot>
      </table>
      {editable && draft && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={POST}
            onClick={() => update((s) => postPayRun(s, run.id).state)}
          >
            Post pay run
          </button>
          <button
            type="button"
            className={SECONDARY}
            onClick={() => update((s) => recalculatePayRun(s, run.id))}
            title="Use the employees’ current details"
          >
            Recalculate
          </button>
          <button
            type="button"
            className={SECONDARY}
            onClick={() => {
              update((s) => deleteDraftPayRun(s, run.id))
              onClose()
            }}
          >
            Delete draft
          </button>
        </div>
      )}
      {!draft && (
        <p className="mt-2 text-sm text-slate-600">
          Posted: wages {formatMoney(t.gross)}; owed to the tax office{' '}
          {formatMoney(t.tax + t.ni)}; owed to the pension provider{' '}
          {formatMoney(t.pension)}; paid to employees {formatMoney(t.net)}.
        </p>
      )}
    </section>
  )
}
