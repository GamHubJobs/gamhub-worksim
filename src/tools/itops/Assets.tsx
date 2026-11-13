/**
 * Asset Management: the register, read by asset, by person or by site; new
 * stock to register; licences; and one record's details with what can be
 * done to it (check out, check in, register, retire). Status and holder
 * always move together.
 */
import { useMemo, useState } from 'react'
import {
  BUTTON,
  CARD,
  INPUT,
  Pill,
  PRIMARY,
  SubTabs,
  type SectionProps,
  type Tone,
} from './kit'
import { BUILD_NAMES } from './deployment'
import {
  assetByTag,
  assignLicence,
  checkIn,
  checkOut,
  computersOf,
  isComputer,
  personById,
  reclaimLicence,
  registerAsset,
  registerProblems,
  setAssetStatus,
  STATUS_NAMES,
  syncDirectory,
} from './model'
import { ASSET_STATUSES, type Asset, type AssetStatus } from './schema'

type Tab = 'assets' | 'users' | 'site' | 'new' | 'licences'

const TONE: Record<AssetStatus, Tone> = {
  'needs-registration': 'amber',
  ready: 'blue',
  deployed: 'green',
  'needs-image': 'amber',
  broken: 'red',
  decommissioned: 'slate',
  lost: 'red',
}
const TODAY = '2026-11-13'

function AssetRecord({ asset, ...p }: SectionProps & { asset: Asset }) {
  const [person, setPerson] = useState('')
  const holder = asset.assignedTo ? personById(p.state, asset.assignedTo) : undefined
  const expired = asset.warrantyEnd < TODAY
  return (
    <section
      className={`${CARD} space-y-3`}
      aria-label={`Asset ${asset.tag}`}
      data-testid="asset-record"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{asset.tag}</h3>
        <Pill tone={TONE[asset.status]}>{STATUS_NAMES[asset.status]}</Pill>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-slate-500">Type</dt>
        <dd className="capitalize">{asset.type}</dd>
        <dt className="text-slate-500">Model</dt>
        <dd>{asset.model}</dd>
        {asset.hostname && (
          <>
            <dt className="text-slate-500">Hostname</dt>
            <dd className="font-mono">{asset.hostname}</dd>
          </>
        )}
        {asset.build && (
          <>
            <dt className="text-slate-500">Build</dt>
            <dd>{BUILD_NAMES[asset.build]}</dd>
          </>
        )}
        <dt className="text-slate-500">Assigned to</dt>
        <dd>{holder?.name ?? asset.site ?? 'Unassigned'}</dd>
        <dt className="text-slate-500">Purchased</dt>
        <dd>{asset.purchased}</dd>
        <dt className="text-slate-500">Warranty</dt>
        <dd>
          {asset.warrantyEnd}{' '}
          {expired ? <Pill tone="red">Expired</Pill> : <Pill tone="green">Covered</Pill>}
        </dd>
        {asset.onShelf && (
          <>
            <dt className="text-slate-500">Location</dt>
            <dd>PC Shelf</dd>
          </>
        )}
        {asset.notes && (
          <>
            <dt className="text-slate-500">Notes</dt>
            <dd>{asset.notes}</dd>
          </>
        )}
      </dl>
      {p.editable && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          {asset.status === 'needs-registration' && (
            <button
              type="button"
              className={PRIMARY}
              onClick={() => p.act((s) => registerAsset(s, asset.tag))}
            >
              Register as Ready to deploy
            </button>
          )}
          {(asset.status === 'ready' ||
            asset.status === 'needs-registration' ||
            asset.status === 'needs-image') && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                className={INPUT}
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                aria-label="Check out to"
              >
                <option value="">Check out to…</option>
                {p.state.people.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} ({x.department}
                    {x.remote ? ', remote' : ''})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={BUTTON}
                disabled={!person}
                onClick={() => p.act((s) => checkOut(s, asset.tag, person))}
              >
                Check out
              </button>
            </div>
          )}
          {asset.status === 'deployed' && (
            <button
              type="button"
              className={BUTTON}
              onClick={() => p.act((s) => checkIn(s, asset.tag))}
            >
              Check in (returned)
            </button>
          )}
          <div className="flex flex-wrap gap-1.5">
            {(['broken', 'lost', 'decommissioned'] as const)
              .filter((s) => s !== asset.status)
              .map((s) => (
                <button
                  key={s}
                  type="button"
                  className={BUTTON}
                  onClick={() => p.act((st) => setAssetStatus(st, asset.tag, s))}
                >
                  Mark {STATUS_NAMES[s].toLowerCase()}
                </button>
              ))}
          </div>
        </div>
      )}
    </section>
  )
}

function AssetTable({
  assets,
  onOpen,
  selected,
  ...p
}: SectionProps & {
  assets: Asset[]
  onOpen: (tag: string) => void
  selected: string | null
}) {
  return (
    <div className={`${CARD} overflow-x-auto p-0`}>
      <table className="w-full text-left text-sm" aria-label="Assets">
        <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
          <tr>
            {['Asset tag', 'Type', 'Model', 'Assigned to', 'Status', 'Warranty'].map(
              (h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {assets.map((a) => (
            <tr
              key={a.tag}
              className={selected === a.tag ? 'bg-teal-50' : ''}
              data-testid="asset-row"
              data-tag={a.tag}
            >
              <td className="px-3 py-1.5">
                <button
                  type="button"
                  className="font-mono text-teal-800 underline"
                  onClick={() => onOpen(a.tag)}
                >
                  {a.tag}
                </button>
              </td>
              <td className="px-3 py-1.5 capitalize">{a.type}</td>
              <td className="px-3 py-1.5">{a.model}</td>
              <td className="px-3 py-1.5">
                {a.assignedTo
                  ? (personById(p.state, a.assignedTo)?.name ?? a.assignedTo)
                  : (a.site ?? '—')}
              </td>
              <td className="px-3 py-1.5">
                <Pill tone={TONE[a.status]}>{STATUS_NAMES[a.status]}</Pill>
              </td>
              <td
                className={`px-3 py-1.5 tabular-nums ${a.warrantyEnd < TODAY ? 'text-red-700' : ''}`}
              >
                {a.warrantyEnd}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {assets.length === 0 && (
        <p className="p-4 text-sm text-slate-600">Nothing matches.</p>
      )}
    </div>
  )
}

export default function Assets(p: SectionProps) {
  const [tab, setTab] = useState<Tab>('assets')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'' | AssetStatus>('')
  const [selected, setSelected] = useState<string | null>(null)
  const { state } = p
  const problems = registerProblems(state)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.assets.filter(
      (a) =>
        (!status || a.status === status) &&
        (!q ||
          [
            a.tag,
            a.model,
            a.type,
            a.hostname ?? '',
            a.assignedTo ? (personById(state, a.assignedTo)?.name ?? '') : '',
            a.site ?? '',
          ]
            .join(' ')
            .toLowerCase()
            .includes(q)),
    )
  }, [state, query, status])
  const record = selected ? assetByTag(state, selected) : undefined
  const unregistered = state.assets.filter((a) => a.status === 'needs-registration')

  return (
    <div className="space-y-4 p-4" data-testid="asset-management">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Asset Management</h2>
          <p className="text-sm text-slate-600">
            {state.assets.length} records ·{' '}
            {state.assets.filter((a) => a.status === 'deployed').length} deployed ·{' '}
            {
              state.assets.filter((a) => a.warrantyEnd < TODAY && a.status === 'deployed')
                .length
            }{' '}
            deployed out of warranty
          </p>
        </div>
        {problems.length > 0 ? (
          <Pill tone="red">
            {problems.length} record problem{problems.length === 1 ? '' : 's'}
          </Pill>
        ) : (
          <Pill tone="green">Register consistent</Pill>
        )}
      </header>
      <SubTabs
        label="Asset Management views"
        value={tab}
        onChange={(t) => setTab(t)}
        tabs={[
          ['assets', 'By assets'],
          ['users', 'By users'],
          ['site', 'Site'],
          ['new', `New asset (${unregistered.length})`],
          ['licences', 'Licences'],
        ]}
      />
      {problems.length > 0 && (
        <ul className="list-disc rounded-md bg-red-50 py-2 pr-3 pl-8 text-sm text-red-900">
          {problems.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-3">
          {tab === 'assets' && (
            <>
              <div className="flex flex-wrap gap-2">
                <input
                  className={`${INPUT} w-64`}
                  placeholder="Search tag, model, person…"
                  aria-label="Search assets"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <select
                  className={INPUT}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AssetStatus | '')}
                  aria-label="Filter by status"
                >
                  <option value="">All statuses</option>
                  {ASSET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_NAMES[s]}
                    </option>
                  ))}
                </select>
              </div>
              <AssetTable
                {...p}
                assets={filtered}
                onOpen={setSelected}
                selected={selected}
              />
            </>
          )}
          {tab === 'users' && (
            <>
              <button
                type="button"
                className={BUTTON}
                disabled={!p.editable}
                onClick={() => p.act(syncDirectory)}
              >
                Sync from directory
              </button>
              <ul className="space-y-2">
                {state.people.map((person) => {
                  const held = state.assets.filter((a) => a.assignedTo === person.id)
                  return (
                    <li
                      key={person.id}
                      className={`${CARD} py-3`}
                      data-testid="asset-person"
                    >
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">{person.name}</span>
                        <span className="text-xs text-slate-600">
                          {person.title}, {person.department}
                          {person.remote ? ' · works from home' : ''}
                        </span>
                        {computersOf(state, person.id).length === 0 && (
                          <Pill tone="amber">No computer</Pill>
                        )}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-1.5">
                        {held.map((a) => (
                          <button
                            key={a.tag}
                            type="button"
                            className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-xs hover:bg-slate-50"
                            onClick={() => setSelected(a.tag)}
                          >
                            {a.tag}
                            {isComputer(a) && a.build ? ` (${BUILD_NAMES[a.build]})` : ''}
                          </button>
                        ))}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          {tab === 'site' && (
            <AssetTable
              {...p}
              assets={state.assets.filter((a) => a.site)}
              onOpen={setSelected}
              selected={selected}
            />
          )}
          {tab === 'new' && (
            <div className={`${CARD} space-y-2 text-sm`}>
              <p className="text-slate-700">
                Built units on the shelf waiting to be booked in. Registering makes them
                countable stock that can be checked out.
              </p>
              {unregistered.length === 0 ? (
                <p className="text-slate-600">
                  Nothing waiting. Build one in Computer Deployment.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {unregistered.map((a) => (
                    <li
                      key={a.tag}
                      className="flex flex-wrap items-center justify-between gap-2 py-1.5"
                    >
                      <span>
                        <span className="font-mono">{a.tag}</span> · {a.hostname} ·{' '}
                        {a.build ? BUILD_NAMES[a.build] : ''}
                      </span>
                      <button
                        type="button"
                        className={PRIMARY}
                        disabled={!p.editable}
                        onClick={() => p.act((s) => registerAsset(s, a.tag))}
                      >
                        Register asset
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {tab === 'licences' && <Licences {...p} />}
        </div>
        <div>
          {record ? (
            <AssetRecord key={record.tag} {...p} asset={record} />
          ) : (
            <p className={`${CARD} text-sm text-slate-600`}>
              Open a record to see its details and what can be done with it.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Licences(p: SectionProps) {
  const [who, setWho] = useState<Record<string, string>>({})
  return (
    <div className="space-y-3">
      {p.state.licences.map((l) => (
        <section
          key={l.product}
          className={CARD}
          aria-label={l.product}
          data-testid="licence"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900">{l.product}</h3>
            <Pill tone={l.assigned.length >= l.seats ? 'red' : 'green'}>
              {l.assigned.length} of {l.seats} seats used
            </Pill>
          </div>
          {l.forDepartments.length > 0 && (
            <p className="text-xs text-slate-600">For: {l.forDepartments.join(', ')}</p>
          )}
          <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {l.assigned.map((id) => (
              <li
                key={id}
                className="flex items-center gap-1 rounded border border-slate-200 px-1.5 py-0.5"
              >
                {personById(p.state, id)?.name ?? `${id} (not in the directory)`}
                {p.editable && (
                  <button
                    type="button"
                    className="text-red-700 underline"
                    onClick={() => p.act((s) => reclaimLicence(s, l.product, id))}
                    aria-label={`Reclaim ${l.product} from ${personById(p.state, id)?.name ?? id}`}
                  >
                    reclaim
                  </button>
                )}
              </li>
            ))}
          </ul>
          {p.editable && (
            <div className="mt-2 flex flex-wrap gap-2">
              <select
                className={INPUT}
                aria-label={`Assign ${l.product} to`}
                value={who[l.product] ?? ''}
                onChange={(e) => setWho((w) => ({ ...w, [l.product]: e.target.value }))}
              >
                <option value="">Assign to…</option>
                {p.state.people
                  .filter((x) => !l.assigned.includes(x.id))
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} ({x.department})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                className={BUTTON}
                disabled={!who[l.product]}
                onClick={() => p.act((s) => assignLicence(s, l.product, who[l.product]))}
              >
                Assign
              </button>
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
