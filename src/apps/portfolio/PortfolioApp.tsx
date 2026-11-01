/**
 * The Portfolio app: every task the player has passed, in every career save
 * on this device, with the work exactly as it was handed in. Items are added
 * only by passing tasks; the player chooses how they are presented.
 */
import { useEffect, useMemo, useState } from 'react'
import { getCareer, getSkill } from '../../content/careers'
import { toolName } from '../../game/portfolio'
import { formatDateTime } from '../../lib/time'
import { listPortfolioItems } from '../../persistence/portfolio'
import { listProfiles } from '../../persistence/profiles'
import type { PortfolioItem, Profile } from '../../persistence/schemas'
import {
  defaultFilters,
  filterItems,
  filterOptions,
  type PortfolioFilters,
  type PortfolioSort,
  type PortfolioTab,
  PORTFOLIO_TABS,
} from './filters'
import { ItemPage } from './ItemPage'
import { SkillsView } from './SkillsView'

type Loaded =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: PortfolioItem[]; profiles: Profile[] }

function saveName(profile: Profile | undefined): string {
  return profile
    ? `${profile.name} · ${getCareer(profile.careerId).name}`
    : 'Another save'
}

export function PortfolioApp({
  profile,
  itemId,
  tab,
  onOpenItem,
  onTab,
}: {
  /** The career save in use (shown first). */
  profile: Profile
  /** The open item, if any. */
  itemId: string | undefined
  /** The screen shown when no item is open. */
  tab: PortfolioTab
  onOpenItem: (itemId: string | undefined) => void
  onTab: (tab: PortfolioTab) => void
}) {
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' })
  const [filters, setFilters] = useState<PortfolioFilters>(() =>
    defaultFilters(profile.id),
  )

  useEffect(() => {
    let active = true
    Promise.all([listPortfolioItems(), listProfiles()]).then(
      ([items, profiles]) => active && setLoaded({ status: 'ready', items, profiles }),
      (e: unknown) =>
        active &&
        setLoaded({
          status: 'error',
          message: e instanceof Error ? e.message : String(e),
        }),
    )
    return () => {
      active = false
    }
    // Reload when a new task is passed (the profile changes with every grade).
  }, [profile.updatedAt])

  const items = useMemo(() => (loaded.status === 'ready' ? loaded.items : []), [loaded])
  const shown = useMemo(() => filterItems([...items], filters), [items, filters])
  const inSaves = useMemo(
    () =>
      filters.profileId === 'all'
        ? items
        : items.filter((i) => i.profileId === filters.profileId),
    [items, filters.profileId],
  )
  const options = useMemo(() => filterOptions(inSaves), [inSaves])

  if (loaded.status === 'loading') {
    return <p className="p-6 text-slate-500">Opening your portfolio…</p>
  }
  if (loaded.status === 'error') {
    return (
      <p role="alert" className="m-6 rounded-lg bg-red-50 p-4 text-red-800">
        Your portfolio could not be opened: {loaded.message}
      </p>
    )
  }

  const profileOf = (id: string) => loaded.profiles.find((p) => p.id === id)
  const open = itemId ? items.find((i) => i.id === itemId) : undefined
  if (open) {
    return (
      <ItemPage
        key={open.id}
        item={open}
        saveName={saveName(profileOf(open.profileId))}
        onBack={() => onOpenItem(undefined)}
        onChanged={(changed) =>
          setLoaded({
            ...loaded,
            items: items.map((i) => (i.id === changed.id ? changed : i)),
          })
        }
      />
    )
  }

  const set = (change: Partial<PortfolioFilters>) => setFilters({ ...filters, ...change })
  const select = 'rounded-md border border-slate-300 bg-white px-2 py-1 text-sm'

  return (
    <div className="h-full overflow-y-auto bg-slate-50" data-testid="portfolio-app">
      <div className="mx-auto max-w-5xl space-y-5 p-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Portfolio</h1>
          <p className="mt-1 text-sm text-slate-600">
            Every task you have passed, with the work exactly as you handed it in. Pass a
            task to add it here. Only passed work appears, and its results cannot be
            edited.
          </p>
        </header>

        <nav
          className="flex gap-1 border-b border-slate-200"
          aria-label="Portfolio sections"
        >
          {PORTFOLIO_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                tab === t.id
                  ? 'border-blue-700 text-blue-800'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <section
          className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
          aria-label="Filters"
        >
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            Career save
            <select
              className={select}
              value={filters.profileId}
              onChange={(e) =>
                set({ profileId: e.target.value, skill: '', tool: '', level: 0 })
              }
            >
              {loaded.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {saveName(p)}
                </option>
              ))}
              <option value="all">All career saves</option>
            </select>
          </label>
          {tab === 'work' && (
            <>
              <label className="flex flex-col gap-1 text-xs text-slate-600">
                Skill
                <select
                  className={select}
                  value={filters.skill}
                  onChange={(e) => set({ skill: e.target.value })}
                >
                  <option value="">Any skill</option>
                  {options.skills.map((id) => (
                    <option key={id} value={id}>
                      {getSkill(id)?.name ?? id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-600">
                Tool
                <select
                  className={select}
                  value={filters.tool}
                  onChange={(e) => set({ tool: e.target.value })}
                >
                  <option value="">Any tool</option>
                  {options.tools.map((id) => (
                    <option key={id} value={id}>
                      {toolName(id)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-600">
                Level
                <select
                  className={select}
                  value={filters.level}
                  onChange={(e) => set({ level: Number(e.target.value) })}
                >
                  <option value={0}>Any level</option>
                  {options.levels.map((level) => (
                    <option key={level} value={level}>
                      Level {level}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-600">
                Sort by
                <select
                  className={select}
                  value={filters.sort}
                  onChange={(e) => set({ sort: e.target.value as PortfolioSort })}
                >
                  <option value="date">Newest first</option>
                  <option value="score">Highest score</option>
                  <option value="level">Highest level</option>
                </select>
              </label>
              <label className="flex items-center gap-2 pb-1 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={filters.includedOnly}
                  onChange={(e) => set({ includedOnly: e.target.checked })}
                />
                Included only
              </label>
            </>
          )}
        </section>

        {tab === 'skills' ? (
          <SkillsView
            items={inSaves}
            profiles={
              filters.profileId === 'all'
                ? loaded.profiles
                : loaded.profiles.filter((p) => p.id === filters.profileId)
            }
            onOpenItem={onOpenItem}
          />
        ) : shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            {items.length === 0
              ? 'Nothing here yet. Pass a task to add it to your portfolio, with the files you handed in.'
              : 'No work matches these filters.'}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2" aria-label="Portfolio items">
            {shown.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpenItem(item.id)}
                  className="h-full w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300 hover:bg-blue-50/40"
                  data-testid="portfolio-card"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-slate-900">{item.title}</span>
                    <span className="shrink-0 font-semibold text-emerald-700">
                      {item.score}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.featured && '★ Featured · '}
                    {item.levelTitle} · {formatDateTime(item.completedAt)}
                    {!item.included && ' · not included in exports'}
                  </p>
                  {filters.profileId === 'all' && (
                    <p className="text-xs text-slate-500">
                      {saveName(profileOf(item.profileId))}
                    </p>
                  )}
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                    {item.summary}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.tools.map(toolName).join(' · ')}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
