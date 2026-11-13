/** SEO Audit: crawl results, page editor, keywords and redirects. */
import { useState } from 'react'
import { Icon } from '../../ui/Icon'
import type { ToolWorkspaceProps } from '../ui'
import { seo } from './definition'
import {
  addRedirect,
  crawl,
  ISSUE_INFO,
  LIMITS,
  removeRedirect,
  setAltText,
  updatePage,
} from './model'
import type { Page, SeoState } from './schema'

type Props = ToolWorkspaceProps<SeoState>
type Act = (fn: (s: SeoState) => { state: SeoState; problems: string[] }) => void

const cell = 'px-3 py-1.5'
const BUTTON =
  'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm hover:bg-slate-50 disabled:opacity-40'
const PRIMARY =
  'rounded-md bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-50'

export default function SeoWorkspace({
  state,
  readOnly,
  onUpdate,
  lockedSections,
}: Props) {
  const [section, setSection] = useState('issues')
  const [page, setPage] = useState<string | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const editable = !readOnly && !!onUpdate
  const act: Act = (fn) => {
    const result = fn(state)
    if (result.problems.length > 0) return setProblems(result.problems)
    setProblems([])
    onUpdate?.((s) => fn(s).state)
  }
  const openPage = (url: string) => {
    setPage(url)
    setSection('pages')
  }
  return (
    <div className="flex h-full min-h-0 bg-slate-50" data-testid="seo">
      <nav
        aria-label="SEO Audit sections"
        className="w-48 shrink-0 space-y-0.5 border-r border-slate-200 bg-white p-2"
      >
        <p className="px-2 pt-1 pb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {state.domain}
        </p>
        {seo.sections.map((s) => {
          const locked = lockedSections[s.id]
          return (
            <button
              key={s.id}
              type="button"
              disabled={!!locked}
              title={locked ? `Unlocks when you become ${locked}.` : s.description}
              onClick={() => {
                setSection(s.id)
                setProblems([])
              }}
              aria-current={section === s.id ? 'page' : undefined}
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm ${
                section === s.id
                  ? 'bg-indigo-50 font-medium text-indigo-900'
                  : locked
                    ? 'text-slate-400'
                    : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {s.name}
              {locked && <Icon name="lock" className="h-3.5 w-3.5" />}
            </button>
          )
        })}
      </nav>
      <div
        className="min-w-0 flex-1 overflow-y-auto p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600"
        // Scrollable, so it can be reached and scrolled with the keyboard.
        tabIndex={0}
        role="region"
        aria-label="Work area"
      >
        {problems.length > 0 && (
          <ul
            role="alert"
            className="mb-3 list-disc rounded-md bg-red-50 p-3 pl-7 text-sm text-red-800"
          >
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {section === 'issues' && (
          <Issues
            state={state}
            editable={editable}
            onCrawl={() => onUpdate?.(crawl)}
            onOpen={openPage}
          />
        )}
        {section === 'pages' && (
          <Pages
            state={state}
            editable={editable}
            act={act}
            selected={page}
            onSelect={setPage}
          />
        )}
        {section === 'keywords' && <Keywords state={state} onOpen={openPage} />}
        {section === 'redirects' && (
          <Redirects
            state={state}
            editable={editable}
            act={act}
            update={(c) => onUpdate?.(c)}
          />
        )}
      </div>
    </div>
  )
}

function Issues({
  state,
  editable,
  onCrawl,
  onOpen,
}: {
  state: SeoState
  editable: boolean
  onCrawl: () => void
  onOpen: (url: string) => void
}) {
  const result = state.crawl
  const types = Object.keys(ISSUE_INFO) as Array<keyof typeof ISSUE_INFO>
  return (
    <div data-testid="seo-issues">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Site audit</h2>
        {editable && (
          <button type="button" className={PRIMARY} onClick={onCrawl}>
            {result ? 'Crawl again' : 'Run crawl'}
          </button>
        )}
      </div>
      {!result ? (
        <p className="text-sm text-slate-600">
          No crawl yet. Run one to see the issues on {state.domain}.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-600" data-testid="crawl-summary">
            Crawl {result.number}: {state.pages.length} pages,{' '}
            <strong>
              {result.issues.length} issue{result.issues.length === 1 ? '' : 's'}
            </strong>
            .{result.issues.length === 0 && ' Nothing to fix.'}
          </p>
          {types
            .filter((t) => result.issues.some((i) => i.type === t))
            .map((t) => (
              <section
                key={t}
                className="mb-3 rounded-lg border border-slate-200 bg-white p-3 text-sm"
              >
                <h3 className="font-semibold text-slate-900">
                  {ISSUE_INFO[t].name} ({result.issues.filter((i) => i.type === t).length}
                  )
                </h3>
                <p className="mb-1 text-xs text-slate-500">{ISSUE_INFO[t].why}</p>
                <ul className="space-y-0.5">
                  {result.issues
                    .filter((i) => i.type === t)
                    .map((i, k) => (
                      <li key={k}>
                        <button
                          type="button"
                          className="font-mono text-indigo-700 underline"
                          onClick={() => onOpen(i.page)}
                        >
                          {i.page}
                        </button>{' '}
                        <span className="text-slate-600">{i.detail}</span>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
        </>
      )}
    </div>
  )
}

function Counted({
  label,
  value,
  min,
  max,
  disabled,
  onCommit,
  multiline = false,
}: {
  label: string
  value: string
  min: number
  max: number
  disabled: boolean
  onCommit: (v: string) => void
  multiline?: boolean
}) {
  const [text, setText] = useState(value)
  const length = text.trim().length
  const ok = length >= min && length <= max
  const props = {
    'aria-label': label,
    value: text,
    disabled,
    onChange: (e: { target: { value: string } }) => setText(e.target.value),
    onBlur: () => text !== value && onCommit(text),
    className: 'w-full rounded border border-slate-300 px-2 py-1 disabled:bg-slate-50',
  }
  return (
    <label className="block text-sm">
      <span className="flex justify-between">
        <span className="font-medium">{label}</span>
        <span className={ok ? 'text-emerald-700' : 'text-amber-700'}>
          {length} / {min}–{max}
        </span>
      </span>
      {multiline ? <textarea rows={3} {...props} /> : <input {...props} />}
    </label>
  )
}

function Pages({
  state,
  editable,
  act,
  selected,
  onSelect,
}: {
  state: SeoState
  editable: boolean
  act: Act
  selected: string | null
  onSelect: (url: string) => void
}) {
  const page = state.pages.find((p) => p.url === selected) ?? null
  return (
    <div className="flex gap-4">
      <ul className="w-64 shrink-0 divide-y divide-slate-100 self-start rounded-lg border border-slate-200 bg-white text-sm">
        {state.pages.map((p) => (
          <li key={p.url}>
            <button
              type="button"
              onClick={() => onSelect(p.url)}
              className={`w-full px-3 py-2 text-left hover:bg-indigo-50 ${selected === p.url ? 'bg-indigo-50' : ''}`}
              data-testid="page-row"
            >
              <span className="block font-mono text-xs text-slate-900">{p.url}</span>
              <span className="block text-xs text-slate-500">
                {p.visits.toLocaleString('en-GB')} search visits a month
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="min-w-0 flex-1">
        {page ? (
          <PageEditor
            key={page.url}
            page={page}
            state={state}
            editable={editable}
            act={act}
          />
        ) : (
          <p className="text-sm text-slate-500">Choose a page to edit it.</p>
        )}
      </div>
    </div>
  )
}

function PageEditor({
  page,
  state,
  editable,
  act,
}: {
  page: Page
  state: SeoState
  editable: boolean
  act: Act
}) {
  const [heading, setHeading] = useState(page.h1)
  return (
    <section
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
      data-testid="page-editor"
    >
      <h3 className="font-mono text-sm font-semibold text-slate-900">
        {state.domain}
        {page.url}
      </h3>
      <div
        className="rounded-md border border-slate-200 bg-slate-50 p-3"
        aria-label="Search result preview"
      >
        <p className="text-xs text-slate-500">How it looks in search results</p>
        <p className="truncate text-lg text-blue-800">
          {page.title.slice(0, 60) || '(no title)'}
          {page.title.length > 60 ? '…' : ''}
        </p>
        <p className="text-xs text-emerald-800">
          https://{state.domain}
          {page.url}
        </p>
        <p className="text-sm text-slate-700">
          {page.description.slice(0, 160) ||
            '(no description: the search engine picks text from the page)'}
          {page.description.length > 160 ? '…' : ''}
        </p>
      </div>
      <Counted
        label="Title"
        value={page.title}
        min={LIMITS.titleMin}
        max={LIMITS.titleMax}
        disabled={!editable}
        onCommit={(title) => act((s) => updatePage(s, page.url, { title }))}
      />
      <Counted
        label="Meta description"
        value={page.description}
        min={LIMITS.descriptionMin}
        max={LIMITS.descriptionMax}
        disabled={!editable}
        multiline
        onCommit={(description) => act((s) => updatePage(s, page.url, { description }))}
      />
      <label className="block text-sm">
        <span className="font-medium">Main heading (H1)</span>
        <input
          aria-label="Main heading"
          value={heading}
          disabled={!editable}
          onChange={(e) => setHeading(e.target.value)}
          onBlur={() =>
            heading !== page.h1 && act((s) => updatePage(s, page.url, { h1: heading }))
          }
          className="w-full rounded border border-slate-300 px-2 py-1 disabled:bg-slate-50"
        />
      </label>
      {page.images.length > 0 && (
        <div className="text-sm">
          <p className="font-medium">Images</p>
          {page.images.map((image) => (
            <AltText
              key={image.src}
              src={image.src}
              alt={image.alt}
              disabled={!editable}
              onCommit={(alt) => act((s) => setAltText(s, page.url, image.src, alt))}
            />
          ))}
        </div>
      )}
      <div className="text-sm">
        <p className="font-medium">Links on this page</p>
        <ul className="font-mono text-xs text-slate-600">
          {page.links.map((l) => (
            <li key={l}>
              {l}
              {state.removed.includes(l) && !state.redirects.some((r) => r.from === l)
                ? '  (404 Not found)'
                : ''}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-slate-500">
        {page.words} words. Changes are saved when you leave a box.
      </p>
    </section>
  )
}

function AltText({
  src,
  alt,
  disabled,
  onCommit,
}: {
  src: string
  alt: string
  disabled: boolean
  onCommit: (alt: string) => void
}) {
  const [text, setText] = useState(alt)
  return (
    <label className="mt-1 flex items-center gap-2">
      <span className="w-40 shrink-0 truncate font-mono text-xs">{src}</span>
      <input
        aria-label={`Alt text for ${src}`}
        value={text}
        disabled={disabled}
        placeholder="Describe the image"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== alt && onCommit(text)}
        className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 disabled:bg-slate-50"
      />
    </label>
  )
}

function Keywords({ state, onOpen }: { state: SeoState; onOpen: (url: string) => void }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Keywords</h2>
      <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
        <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
          <tr>
            <th className={cell}>Search phrase</th>
            <th className={`${cell} text-right`}>Searches a month</th>
            <th className={`${cell} text-right`}>Our position</th>
            <th className={cell}>Page</th>
          </tr>
        </thead>
        <tbody>
          {state.keywords.map((k) => (
            <tr key={k.keyword} className="border-t border-slate-100">
              <td className={cell}>{k.keyword}</td>
              <td className={`${cell} text-right tabular-nums`}>
                {k.volume.toLocaleString('en-GB')}
              </td>
              <td
                className={`${cell} text-right tabular-nums ${k.position > 10 ? 'text-amber-700' : 'text-emerald-700'}`}
              >
                {k.position || '—'}
                {k.position > 10 && (
                  <span className="block text-xs">page {Math.ceil(k.position / 10)}</span>
                )}
              </td>
              <td className={cell}>
                <button
                  type="button"
                  className="font-mono text-indigo-700 underline"
                  onClick={() => onOpen(k.page)}
                >
                  {k.page}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">
        Positions beyond 10 are on the second page of results, where very few people look.
      </p>
    </div>
  )
}

function Redirects({
  state,
  editable,
  act,
  update,
}: {
  state: SeoState
  editable: boolean
  act: Act
  update: (c: (s: SeoState) => SeoState) => void
}) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  return (
    <div data-testid="redirects">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Redirects</h2>
      <p className="mb-3 text-sm text-slate-600">
        Old addresses that no longer exist: {state.removed.join(', ')}.
      </p>
      {editable && (
        <div className="mb-4 flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col gap-1">
            From (old address)
            <select
              aria-label="Redirect from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1 font-mono"
            >
              <option value="">Choose…</option>
              {state.removed.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            To (live page)
            <select
              aria-label="Redirect to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1 font-mono"
            >
              <option value="">Choose…</option>
              {state.pages.map((p) => (
                <option key={p.url}>{p.url}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={PRIMARY}
            disabled={!from || !to}
            onClick={() => {
              act((s) => addRedirect(s, from, to))
              setFrom('')
              setTo('')
            }}
          >
            Add redirect
          </button>
        </div>
      )}
      {state.redirects.length === 0 ? (
        <p className="text-sm text-slate-500">No redirects.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {state.redirects.map((r) => (
            <li
              key={r.from}
              className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-1.5 font-mono"
              data-testid="redirect"
            >
              <span>
                {r.from} → {r.to}
              </span>
              {editable && (
                <button
                  type="button"
                  className={BUTTON}
                  onClick={() => update((s) => removeRedirect(s, r.from))}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
