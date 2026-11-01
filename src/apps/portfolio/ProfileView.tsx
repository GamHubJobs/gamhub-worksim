/**
 * The employability profile: the player writes how they introduce themselves;
 * everything about their results is generated from the records and can only
 * be shown or hidden. A live preview shows exactly what will be exported.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildEmployabilityProfile,
  misleadingWords,
  PROFILE_SECTIONS,
  type ProfileSectionId,
  type ProfileSettings,
} from '../../game/employabilityProfile'
import type { Block } from '../../export/blocks'
import { profileBlocks, profileHtml } from '../../export/profile'
import { downloadFile, safeFileName } from '../../lib/download'
import { getProfileSettings, saveProfileSettings } from '../../persistence/employability'
import { updatePortfolioPresentation } from '../../persistence/portfolio'
import type { PortfolioItem, Profile } from '../../persistence/schemas'

function Preview({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'heading':
            return block.level === 1 ? (
              <h3 key={i} className="mt-4 font-semibold text-slate-900">
                {block.text}
              </h3>
            ) : (
              <h4 key={i} className="mt-2 text-sm font-medium text-slate-900">
                {block.text}
              </h4>
            )
          case 'paragraph':
            return (
              <p key={i} className="mt-1 text-sm text-slate-700">
                {block.text}
              </p>
            )
          case 'list':
            return (
              <ul key={i} className="mt-1 list-disc pl-5 text-sm text-slate-700">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )
          default:
            return null
        }
      })}
    </>
  )
}

export function ProfileView({
  profiles,
  items,
  defaultName,
  onItemChanged,
}: {
  /** The career saves the profile covers. */
  profiles: Profile[]
  items: PortfolioItem[]
  defaultName: string
  onItemChanged: (item: PortfolioItem) => void
}) {
  const [settings, setSettings] = useState<ProfileSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const saving = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    let active = true
    getProfileSettings(defaultName).then(
      (loaded) => active && setSettings(loaded),
      (e: unknown) => active && setError(e instanceof Error ? e.message : String(e)),
    )
    return () => {
      active = false
    }
  }, [defaultName])

  const built = useMemo(
    () => (settings ? buildEmployabilityProfile(settings, profiles, items) : null),
    [settings, profiles, items],
  )
  const featured = useMemo(
    () =>
      items
        .filter(
          (i) => i.featured && i.included && profiles.some((p) => p.id === i.profileId),
        )
        .sort((a, b) => a.order - b.order || b.completedAt - a.completedAt),
    [items, profiles],
  )

  if (!settings || !built) {
    return error ? (
      <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
        {error}
      </p>
    ) : (
      <p className="text-slate-500">Opening your profile…</p>
    )
  }

  /** Changes are shown at once and saved one after another. */
  function update(change: Partial<ProfileSettings>) {
    const next = { ...settings!, ...change }
    setSettings(next)
    saving.current = saving.current.then(() =>
      saveProfileSettings(next).catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      ),
    )
  }

  function toggle(id: ProfileSectionId, shown: boolean) {
    const hidden = new Set(settings!.hidden)
    if (shown) hidden.delete(id)
    else hidden.add(id)
    update({ hidden: [...hidden] })
  }

  /** Moves a featured item up or down by renumbering the featured list. */
  async function move(index: number, by: -1 | 1) {
    const order = [...featured]
    const [moved] = order.splice(index, 1)
    order.splice(index + by, 0, moved)
    try {
      for (const [i, item] of order.entries()) {
        if (item.order !== i)
          onItemChanged(await updatePortfolioPresentation(item.id, { order: i }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function download(kind: 'pdf' | 'html') {
    setError(null)
    try {
      const { profilePdf } = await import('../../export/pdf/profile')
      const name = `${safeFileName(built!.name)} - profile`
      if (kind === 'pdf')
        downloadFile(`${name}.pdf`, profilePdf(built!), 'application/pdf')
      else downloadFile(`${name}.html`, profileHtml(built!), 'text/html')
    } catch (e) {
      setError(
        `The profile could not be made: ${e instanceof Error ? e.message : String(e)}`,
      )
    }
  }

  const warning = misleadingWords(`${settings.headline} ${settings.summary}`)
  const field = 'mt-1 block w-full rounded-md border border-slate-300 px-2 py-1 text-sm'

  return (
    <div className="grid gap-5 lg:grid-cols-2" data-testid="profile-view">
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="font-semibold text-slate-900">In your own words</h2>
          <p className="text-sm text-slate-600">
            How you introduce yourself. Your results below come from your passed work and
            cannot be edited here.
          </p>
        </div>
        <label className="block text-sm">
          <span className="font-medium text-slate-800">Display name</span>
          <input
            className={field}
            maxLength={60}
            value={settings.displayName}
            onChange={(e) => update({ displayName: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-800">Headline</span>
          <input
            className={field}
            maxLength={120}
            placeholder="e.g. Detail-minded and keen to grow in finance"
            value={settings.headline}
            onChange={(e) => update({ headline: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-800">Summary</span>
          <textarea
            className={field}
            rows={4}
            maxLength={800}
            placeholder="What you enjoy, what you have practised, and what you want to do next."
            value={settings.summary}
            onChange={(e) => update({ summary: e.target.value })}
          />
          <span className="text-xs text-slate-500">{settings.summary.length}/800</span>
        </label>
        {warning && (
          <p
            role="status"
            className="rounded-md bg-amber-50 p-3 text-sm text-amber-900"
            data-testid="profile-warning"
          >
            “{warning}”: this profile shows work done in a simulation. Please don’t
            describe it as employment, a qualification or a reference.
          </p>
        )}

        <fieldset>
          <legend className="text-sm font-medium text-slate-800">Sections to show</legend>
          <div className="mt-1 space-y-1">
            {PROFILE_SECTIONS.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!settings.hidden.includes(s.id)}
                  onChange={(e) => toggle(s.id, e.target.checked)}
                />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <h3 className="text-sm font-medium text-slate-800">Featured work</h3>
          {featured.length === 0 ? (
            <p className="text-sm text-slate-600">
              Feature a piece of work on its page (in Work) to show it here.
            </p>
          ) : (
            <ol className="mt-1 space-y-1 text-sm" aria-label="Featured work order">
              {featured.map((item, i) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span>
                    {i + 1}. {item.title}
                  </span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => void move(i, -1)}
                      aria-label={`Move ${item.title} up`}
                      className="rounded border border-slate-300 px-2 disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={i === featured.length - 1}
                      onClick={() => void move(i, 1)}
                      aria-label={`Move ${item.title} down`}
                      className="rounded border border-slate-300 px-2 disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void download('pdf')}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Download profile (PDF)
          </button>
          <button
            type="button"
            onClick={() => void download('html')}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Download as a web page
          </button>
        </div>
        {error && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
      </section>

      <article
        className="rounded-xl border border-slate-200 bg-white p-6"
        aria-label="Profile preview"
        data-testid="profile-preview"
      >
        <p className="text-xs tracking-wide text-slate-500 uppercase">Preview</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{built.name}</h2>
        <Preview blocks={profileBlocks(built)} />
      </article>
    </div>
  )
}
