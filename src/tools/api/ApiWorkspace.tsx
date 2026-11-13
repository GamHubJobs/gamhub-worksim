/** API Client: request builder, response, history, collection, reference, environment, bug report. */
import { useState } from 'react'
import type { ToolWorkspaceProps } from '../ui'
import { apiClient } from './definition'
import { METHODS, type ApiRequest, type ApiState, type Method } from './schema'
import { send, STATUS_TEXT } from './server'

type Props = ToolWorkspaceProps<ApiState>
type Update = (change: (s: ApiState) => ApiState) => void

const BUTTON =
  'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm hover:bg-slate-50 disabled:opacity-40'
const PRIMARY =
  'rounded-md bg-indigo-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-50'

const statusTone = (s: number) =>
  s < 300
    ? 'bg-emerald-100 text-emerald-800'
    : s < 500
      ? 'bg-amber-100 text-amber-800'
      : 'bg-red-100 text-red-800'

const EMPTY: ApiRequest = {
  method: 'GET',
  url: '{{baseUrl}}/v1/projects',
  headers: [{ key: 'Authorization', value: 'Bearer {{readToken}}' }],
  body: '',
}

export default function ApiWorkspace({ state, readOnly, onUpdate }: Props) {
  const [section, setSection] = useState('request')
  const editable = !readOnly && !!onUpdate
  const update: Update = (change) => onUpdate?.(change)
  return (
    <div className="flex h-full min-h-0 bg-slate-50" data-testid="api">
      <nav
        aria-label="API Client sections"
        className="w-44 shrink-0 space-y-0.5 border-r border-slate-200 bg-white p-2"
      >
        {apiClient.sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            aria-current={section === s.id ? 'page' : undefined}
            className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm ${section === s.id ? 'bg-indigo-50 font-medium text-indigo-900' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            {s.name}
          </button>
        ))}
      </nav>
      <div
        className="min-w-0 flex-1 overflow-y-auto p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600"
        // Scrollable, so it can be reached and scrolled with the keyboard.
        tabIndex={0}
        role="region"
        aria-label="Work area"
      >
        {section === 'request' && (
          <RequestSection state={state} editable={editable} update={update} />
        )}
        {section === 'docs' && <Reference />}
        {section === 'environment' && (
          <Environment state={state} editable={editable} update={update} />
        )}
        {section === 'report' && (
          <Report state={state} editable={editable} update={update} />
        )}
      </div>
    </div>
  )
}

function RequestSection({
  state,
  editable,
  update,
}: {
  state: ApiState
  editable: boolean
  update: Update
}) {
  const [request, setRequest] = useState<ApiRequest>(EMPTY)
  const [name, setName] = useState('')
  const latest = state.history[state.history.length - 1]
  const [shown, setShown] = useState<number | null>(null)
  const response = shown === null ? latest : state.history[shown]
  const set = (patch: Partial<ApiRequest>) => setRequest((r) => ({ ...r, ...patch }))
  const hasBody = request.method === 'POST' || request.method === 'PATCH'
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          aria-label="Method"
          value={request.method}
          disabled={!editable}
          onChange={(e) => set({ method: e.target.value as Method })}
          className="rounded border border-slate-300 px-2 py-1.5 font-mono text-sm font-semibold"
        >
          {METHODS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <input
          aria-label="URL"
          value={request.url}
          disabled={!editable}
          onChange={(e) => set({ url: e.target.value })}
          spellCheck={false}
          className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5 font-mono text-sm"
        />
        <button
          type="button"
          className={PRIMARY}
          disabled={!editable}
          onClick={() => {
            update((s) => send(s, request))
            setShown(null)
          }}
        >
          Send
        </button>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <h3 className="mb-2 font-semibold">Headers</h3>
        {request.headers.map((h, i) => (
          <div key={i} className="mb-1 flex gap-2">
            <input
              aria-label={`Header ${i + 1} name`}
              value={h.key}
              disabled={!editable}
              onChange={(e) =>
                set({
                  headers: request.headers.map((x, k) =>
                    k === i ? { ...x, key: e.target.value } : x,
                  ),
                })
              }
              className="w-44 rounded border border-slate-300 px-2 py-1 font-mono"
            />
            <input
              aria-label={`Header ${i + 1} value`}
              value={h.value}
              disabled={!editable}
              onChange={(e) =>
                set({
                  headers: request.headers.map((x, k) =>
                    k === i ? { ...x, value: e.target.value } : x,
                  ),
                })
              }
              className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 font-mono"
            />
            {editable && (
              <button
                type="button"
                className={BUTTON}
                aria-label={`Remove header ${i + 1}`}
                onClick={() =>
                  set({ headers: request.headers.filter((_, k) => k !== i) })
                }
              >
                ×
              </button>
            )}
          </div>
        ))}
        {editable && (
          <button
            type="button"
            className={BUTTON}
            onClick={() => set({ headers: [...request.headers, { key: '', value: '' }] })}
          >
            Add header
          </button>
        )}
      </section>

      {hasBody && (
        <section className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <h3 className="mb-2 font-semibold">Body (JSON)</h3>
          <textarea
            aria-label="Body"
            rows={6}
            value={request.body}
            disabled={!editable}
            spellCheck={false}
            onChange={(e) => set({ body: e.target.value })}
            placeholder={
              '{\n  "person": "maya.patel",\n  "project": "PRJ-1042",\n  "date": "2026-03-04",\n  "hours": 7.5,\n  "description": "Client workshop"\n}'
            }
            className="w-full rounded border border-slate-300 p-2 font-mono text-sm"
          />
        </section>
      )}

      {response && (
        <section
          className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
          data-testid="response"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">Response</h3>
            <span
              className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${statusTone(response.status)}`}
              data-testid="status"
            >
              {response.status} {STATUS_TEXT[response.status] ?? ''}
            </span>
            <span className="font-mono text-xs text-slate-500">
              {response.method} {response.sentUrl}
            </span>
          </div>
          <pre
            className="max-h-64 overflow-auto rounded bg-slate-950 p-3 font-mono text-xs text-slate-100"
            data-testid="response-body"
          >
            {response.response || '(no body)'}
          </pre>
        </section>
      )}

      {editable && (
        <form
          className="flex items-center gap-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            update((s) => ({
              ...s,
              collection: [...s.collection, { ...request, name: name.trim() }].slice(-50),
            }))
            setName('')
          }}
        >
          <input
            aria-label="Request name"
            placeholder="Name this request to save it"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-72 rounded border border-slate-300 px-2 py-1"
          />
          <button type="submit" className={BUTTON} disabled={!name.trim()}>
            Save to collection
          </button>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="text-sm">
          <h3 className="mb-1 font-semibold">Collection</h3>
          {state.collection.length === 0 ? (
            <p className="text-slate-500">No saved requests.</p>
          ) : (
            <ul className="space-y-1">
              {state.collection.map((c, i) => (
                <li key={i} data-testid="saved-request">
                  <button
                    type="button"
                    className="w-full truncate rounded border border-slate-200 bg-white px-2 py-1 text-left hover:bg-indigo-50"
                    onClick={() =>
                      setRequest({
                        method: c.method,
                        url: c.url,
                        headers: c.headers,
                        body: c.body,
                      })
                    }
                  >
                    <span className="font-mono text-xs font-semibold">{c.method}</span>{' '}
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="text-sm">
          <h3 className="mb-1 font-semibold">History</h3>
          <ul className="max-h-60 space-y-1 overflow-y-auto">
            {[...state.history.entries()].reverse().map(([i, h]) => (
              <li key={i}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 truncate rounded border border-slate-200 bg-white px-2 py-1 text-left hover:bg-indigo-50"
                  onClick={() => {
                    setShown(i)
                    setRequest({
                      method: h.method,
                      url: h.url,
                      headers: h.headers,
                      body: h.body,
                    })
                  }}
                >
                  <span
                    className={`rounded px-1.5 font-mono text-xs ${statusTone(h.status)}`}
                  >
                    {h.status}
                  </span>
                  <span className="font-mono text-xs">{h.method}</span>
                  <span className="truncate font-mono text-xs text-slate-600">
                    {h.sentUrl}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function Reference() {
  const rows: Array<[string, string, string]> = [
    ['GET', '/v1/projects', 'List the projects. 200.'],
    [
      'GET',
      '/v1/timesheets?person=maya.patel',
      'List entries, optionally for one person or project. 200.',
    ],
    ['GET', '/v1/timesheets/{id}', 'One entry. 200, or 404 if there is none.'],
    [
      'POST',
      '/v1/timesheets',
      'Create an entry. 201 with the new entry, 422 with errors if a rule is broken, 400 if the body isn’t JSON.',
    ],
    [
      'PATCH',
      '/v1/timesheets/{id}',
      'Change some fields of an entry. The same rules as POST apply. 200, 422 or 404.',
    ],
    ['DELETE', '/v1/timesheets/{id}', 'Remove an entry. 204.'],
  ]
  return (
    <div className="space-y-4 text-sm" data-testid="api-reference">
      <h2 className="text-lg font-semibold text-slate-900">Timesheet API v1</h2>
      <p>
        Every request needs{' '}
        <code className="rounded bg-slate-100 px-1">
          Authorization: Bearer &lt;token&gt;
        </code>{' '}
        (401 without). Read tokens can only GET; changes need a write token (403
        otherwise).
      </p>
      <table className="w-full rounded-lg border border-slate-200 bg-white">
        <tbody>
          {rows.map(([m, p, d]) => (
            <tr key={m + p} className="border-t border-slate-100 first:border-t-0">
              <td className="px-3 py-1.5 font-mono font-semibold">{m}</td>
              <td className="px-3 py-1.5 font-mono">{p}</td>
              <td className="px-3 py-1.5">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <h3 className="font-semibold">Rules for an entry</h3>
        <ul className="list-disc pl-5">
          <li>
            <code>person</code>: required
          </li>
          <li>
            <code>project</code>: an existing project code
          </li>
          <li>
            <code>date</code>: YYYY-MM-DD
          </li>
          <li>
            <code>hours</code>: more than 0, no more than 12, in quarter hours
          </li>
          <li>
            <code>description</code>: at least 5 characters
          </li>
        </ul>
      </div>
    </div>
  )
}

function Environment({
  state,
  editable,
  update,
}: {
  state: ApiState
  editable: boolean
  update: Update
}) {
  return (
    <div className="space-y-3 text-sm" data-testid="environment">
      <h2 className="text-lg font-semibold text-slate-900">Environment</h2>
      <p className="text-slate-600">
        Use these as <code className="rounded bg-slate-100 px-1">{'{{name}}'}</code> in
        the address, headers and body. Keeping secrets in variables means they never have
        to be pasted into saved requests.
      </p>
      <table className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white">
        <tbody>
          {state.environment.map((v, i) => (
            <tr key={v.name} className="border-t border-slate-100 first:border-t-0">
              <td className="px-3 py-1.5 font-mono font-semibold">{v.name}</td>
              <td className="px-3 py-1.5">
                <input
                  aria-label={`Variable ${v.name}`}
                  value={v.value}
                  disabled={!editable}
                  onChange={(e) =>
                    update((s) => ({
                      ...s,
                      environment: s.environment.map((x, k) =>
                        k === i ? { ...x, value: e.target.value } : x,
                      ),
                    }))
                  }
                  className="w-full rounded border border-slate-300 px-2 py-1 font-mono"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Report({
  state,
  editable,
  update,
}: {
  state: ApiState
  editable: boolean
  update: Update
}) {
  const [text, setText] = useState(state.report)
  return (
    <div className="space-y-2 text-sm" data-testid="bug-report">
      <h2 className="text-lg font-semibold text-slate-900">Bug report</h2>
      <p className="text-slate-600">
        For each problem: the request that shows it (method, address, body), what the API
        did, and what it should have done according to the reference.
      </p>
      <textarea
        aria-label="Bug report"
        rows={12}
        value={text}
        disabled={!editable}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== state.report && update((s) => ({ ...s, report: text }))}
        className="w-full rounded border border-slate-300 p-2"
      />
    </div>
  )
}
