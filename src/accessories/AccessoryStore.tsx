/**
 * The accessories shop and the wardrobe (content/accessories.ts, game/accessories.ts):
 *
 * - the shop: everything by category (or what belongs to the player's job), each
 *   with its price, tier and what it does; a product turned in 3D (drag to turn,
 *   scroll to zoom), or tried on the player; colours; up to three side by side;
 *   bought with money earned at work, after a confirmation;
 * - the wardrobe: the player in 3D wearing what they have on; everything owned,
 *   with its condition, put on and taken off, packed into a bag, sold on; and
 *   what was bought and sold.
 *
 * Opened from the phone's Style app, the pause menu's inventory, or the wardrobe
 * at home (store.ts). Every change goes through the save (`act`), so it is on the
 * character at once, in every place, and kept.
 */
import { Bounds, Center, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  CATEGORIES,
  POCKETS,
  SLOT_NAMES,
  TIERS,
  capacityOf,
  getAccessory,
  type Accessory,
  type Category,
  type Use,
} from '../content/accessories'
import { formatMoney } from '../content/life'
import {
  buyAccessory,
  canBuyAccessory,
  capacity,
  catalogue,
  conditionWord,
  packAccessory,
  packable,
  resaleOf,
  sellAccessory,
  takeOffAccessory,
  unpackAccessory,
  wearAccessory,
  wornModels,
  type Owned,
} from '../game/accessories'
import type { ProfileData } from '../game/career'
import { PLAYER } from '../city/scene/interiors/kit'
import { Person } from '../office/scene/people'
import { Showcase } from '../world/character/accessories3d'
import { dressed } from '../world/character/playerWear'
import { closeStore, showTab, useStore } from './store'

type Act = (change: (p: ProfileData) => ProfileData) => unknown

/** What an item does, in a sentence each. */
const USE_TEXT: Partial<Record<Use, string>> = {
  time: 'Shows the time on your wrist (at the top of the screen while worn).',
  notifications: 'Shows how many messages you have not read.',
  activity: 'Shows your energy and stress, and when you went to bed.',
  audio: 'The world around you is quieter while you wear them.',
  'noise-cancel': 'Cancels most of the noise around you.',
  'ppe-head': 'Safety kit: counts at the site gate (otherwise the site lends you one).',
  'ppe-eyes': 'Safety kit: counts at the site gate and in the workshop.',
  'ppe-feet': 'Safety kit: counts at the site gate.',
  'ppe-body': 'Safety kit: counts at the site gate.',
  'ppe-hands': 'Protection for your hands when handling materials or giving care.',
  'ppe-ears': 'Hearing protection for noisy plant and workshops.',
  stethoscope: 'Your own to listen with at the bedside.',
  id: 'Your photo ID at work.',
  tool: 'A work thing: carry it, or pack it in a bag.',
}

function usesOfItem(a: Accessory): string[] {
  const out = (a.uses ?? []).flatMap((u) => (USE_TEXT[u] ? [USE_TEXT[u]!] : []))
  const room = capacityOf(a)
  if (room) out.push(`Room for ${room} work things.`)
  return out
}

const TIER_STYLE: Record<Accessory['tier'], string> = {
  basic: 'bg-slate-100 text-slate-700',
  standard: 'bg-sky-50 text-sky-800',
  premium: 'bg-violet-50 text-violet-800',
  luxury: 'bg-amber-50 text-amber-800',
  professional: 'bg-emerald-50 text-emerald-800',
}

export function AccessoryStore({ profile, act }: { profile: ProfileData; act: Act }) {
  const store = useStore()
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!store.open) return
    box.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeStore()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store.open])
  if (!store.open) return null
  const money = profile.work.life.money
  return (
    <div className="motion-fade fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-label={store.tab === 'shop' ? 'Accessories shop' : 'Wardrobe'}
        data-testid="accessory-store"
        className="motion-pop flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none"
      >
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3">
          <nav
            aria-label="Accessories"
            className="flex gap-1 rounded-lg bg-slate-100 p-1"
          >
            {(
              [
                ['shop', 'Shop'],
                ['wardrobe', 'Wardrobe'],
              ] as const
            ).map(([id, name]) => (
              <button
                key={id}
                type="button"
                aria-pressed={store.tab === id}
                onClick={() => showTab(id)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold ${
                  store.tab === id ? 'bg-white text-slate-900 shadow' : 'text-slate-600'
                }`}
              >
                {name}
              </button>
            ))}
          </nav>
          <p className="ml-auto text-sm text-slate-600">
            In the bank:{' '}
            <span className="font-semibold text-slate-900" data-testid="store-money">
              {formatMoney(money)}
            </span>
          </p>
          <button
            type="button"
            onClick={closeStore}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </header>
        {store.tab === 'shop' ? (
          <ShopTab profile={profile} act={act} />
        ) : (
          <WardrobeTab profile={profile} act={act} />
        )}
      </div>
    </div>
  )
}

/** A small 3D stage: lit, turning slowly, dragged to turn and scrolled to zoom. */
function Stage({
  children,
  label,
  fit = true,
  target = [0, 0, 0],
  distance = 1,
}: {
  children: ReactNode
  label: string
  fit?: boolean
  target?: [number, number, number]
  distance?: number
}) {
  return (
    <div
      className="relative h-64 overflow-hidden rounded-xl bg-gradient-to-b from-slate-100 to-slate-200"
      role="img"
      aria-label={label}
      data-testid="preview-3d"
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{
          position: [target[0], target[1] + 0.15 * distance, target[2] + 2.6 * distance],
          fov: 32,
        }}
      >
        <hemisphereLight args={['#ffffff', '#94a3b8', 1.2]} />
        <directionalLight position={[2, 3, 3]} intensity={1.7} />
        <directionalLight position={[-3, 1.5, -2]} intensity={0.6} />
        {fit ? (
          <Bounds fit clip observe margin={1.25}>
            <Center>{children}</Center>
          </Bounds>
        ) : (
          children
        )}
        <OrbitControls
          makeDefault
          target={target}
          enablePan={false}
          autoRotate
          autoRotateSpeed={1.4}
          minDistance={0.3 * distance}
          maxDistance={5 * distance}
        />
      </Canvas>
      <p className="pointer-events-none absolute bottom-2 left-3 text-xs text-slate-500">
        Drag to turn · scroll to zoom
      </p>
    </div>
  )
}

/** The player, wearing these (as they are dressed out of work). */
function OnYou({ wear }: { wear: ReturnType<typeof wornModels> }) {
  const look = useMemo(() => dressed(PLAYER, wear), [wear])
  // Facing the camera (people face −z; the camera looks from +z).
  return <Person look={look} rotation={Math.PI} />
}

function ShopTab({ profile, act }: { profile: ProfileData; act: Act }) {
  const life = profile.work.life
  const [category, setCategory] = useState<Category | 'career'>('career')
  const [owned, setOwned] = useState<'all' | 'owned' | 'new'>('all')
  const all = useMemo(() => catalogue(), [])
  const list = all.filter(
    (a) =>
      (category === 'career'
        ? a.careers?.includes(profile.careerId)
        : a.category === category) &&
      (owned === 'all' ||
        (owned === 'owned') === life.wardrobe.owned.some((o) => o.id === a.id)),
  )
  const [picked, setPicked] = useState<string | null>(null)
  const item = getAccessory(picked ?? '') ?? list[0] ?? null
  const [compare, setCompare] = useState<string[]>([])
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[13rem_1fr_22rem] md:overflow-hidden">
      <nav
        aria-label="Categories"
        className="flex gap-1 overflow-x-auto border-b border-slate-200 p-3 md:flex-col md:overflow-y-auto md:border-r md:border-b-0"
      >
        {[{ id: 'career' as const, name: 'For your job' }, ...CATEGORIES].map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={category === c.id}
            onClick={() => {
              setCategory(c.id)
              setPicked(null)
            }}
            className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm ${
              category === c.id
                ? 'bg-slate-900 font-semibold text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {c.name}
          </button>
        ))}
      </nav>
      <section aria-label="Products" className="min-h-0 overflow-y-auto p-4">
        <div className="mb-3 flex items-center gap-2 text-xs">
          {(
            [
              ['all', 'All'],
              ['new', 'Not owned'],
              ['owned', 'Owned'],
            ] as const
          ).map(([id, name]) => (
            <button
              key={id}
              type="button"
              aria-pressed={owned === id}
              onClick={() => setOwned(id)}
              className={`rounded-full px-3 py-1 ${
                owned === id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {name}
            </button>
          ))}
          <span className="ml-auto text-slate-500">{list.length} items</span>
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing here yet.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((a) => {
              const count = life.wardrobe.owned.filter((o) => o.id === a.id).length
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(a.id)}
                    aria-pressed={item?.id === a.id}
                    data-testid={`product-${a.id}`}
                    className={`flex w-full flex-col gap-1 rounded-xl border p-3 text-left ${
                      item?.id === a.id
                        ? 'border-slate-900 ring-1 ring-slate-900'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-3 w-3 shrink-0 rounded-full ring-1 ring-slate-300"
                        style={{ background: a.colours[0] }}
                      />
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {a.name}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-xs">
                      <span className={`rounded px-1.5 py-0.5 ${TIER_STYLE[a.tier]}`}>
                        {TIERS[a.tier]}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {formatMoney(a.price)}
                      </span>
                      {count > 0 && (
                        <span className="text-emerald-700">
                          Owned{count > 1 ? ` ×${count}` : ''}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {compare.length > 0 && (
          <Comparison
            ids={compare}
            profile={profile}
            onRemove={(id) => setCompare((c) => c.filter((x) => x !== id))}
          />
        )}
      </section>
      {item && (
        <Product
          key={item.id}
          item={item}
          profile={profile}
          act={act}
          comparing={compare.includes(item.id)}
          onCompare={() =>
            setCompare((c) =>
              c.includes(item.id)
                ? c.filter((x) => x !== item.id)
                : [...c, item.id].slice(-3),
            )
          }
        />
      )}
    </div>
  )
}

function Product({
  item,
  profile,
  act,
  comparing,
  onCompare,
}: {
  item: Accessory
  profile: ProfileData
  act: Act
  comparing: boolean
  onCompare: () => void
}) {
  const life = profile.work.life
  const [colour, setColour] = useState(0)
  // On a stand, or on the player (vests and gloves are only seen on).
  const onlyOn = item.slot === 'body' || item.slot === 'hands'
  const [view, setView] = useState<'item' | 'on'>(onlyOn ? 'on' : 'item')
  const [confirm, setConfirm] = useState(false)
  const [bought, setBought] = useState<string | null>(null)
  const why = canBuyAccessory(profile, item.id)
  const wear = useMemo(
    () => ({ model: item.model, slot: item.slot, colour: item.colours[colour] }),
    [item, colour],
  )
  // Tried on: with what they wear already, this in its place.
  const tried = useMemo(
    () => [
      ...wornModels(life).filter((w) => w.slot !== item.slot),
      { ...wear, id: item.id },
    ],
    [life, wear, item.id, item.slot],
  )
  const uses = usesOfItem(item)
  return (
    <aside
      aria-label={item.name}
      data-testid="product-detail"
      className="flex min-h-0 flex-col gap-3 overflow-y-auto border-t border-slate-200 p-4 md:border-t-0 md:border-l"
    >
      {view === 'item' ? (
        <Stage label={`${item.name}, turning`}>
          <Showcase wear={wear} />
        </Stage>
      ) : (
        <Stage
          label={`You, wearing the ${item.name}`}
          fit={false}
          target={[0, 0.92, 0]}
          distance={1.4}
        >
          <OnYou wear={tried} />
        </Stage>
      )}
      {!onlyOn && (
        <div className="flex gap-1 text-xs" role="group" aria-label="View">
          {(
            [
              ['item', 'The item'],
              ['on', 'Try it on'],
            ] as const
          ).map(([id, name]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={`rounded-full px-3 py-1 ${view === id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div>
        <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className={`rounded px-1.5 py-0.5 ${TIER_STYLE[item.tier]}`}>
            {TIERS[item.tier]}
          </span>
          <span>{SLOT_NAMES[item.slot]}</span>
          {item.careers?.includes(profile.careerId) && (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-800">
              For your job
            </span>
          )}
        </p>
        <p className="mt-2 text-sm text-slate-700">{item.description}</p>
        {uses.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-slate-700" aria-label="What it does">
            {uses.map((u) => (
              <li key={u} className="flex gap-2">
                <span
                  aria-hidden
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                />
                {u}
              </li>
            ))}
          </ul>
        )}
      </div>
      {item.colours.length > 1 && (
        <div role="radiogroup" aria-label="Colour" className="flex gap-2">
          {item.colours.map((c, i) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={colour === i}
              aria-label={`Colour ${i + 1}`}
              onClick={() => setColour(i)}
              className={`h-7 w-7 rounded-full ring-2 ring-offset-2 ${colour === i ? 'ring-slate-900' : 'ring-transparent'}`}
              style={{ background: c }}
            />
          ))}
        </div>
      )}
      <p className="text-2xl font-bold text-slate-900">{formatMoney(item.price)}</p>
      {bought ? (
        <div
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"
          role="status"
        >
          Bought: it’s in your wardrobe.
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                void act((p) => wearAccessory(p, bought).profile)
                setBought(null)
              }}
              className="rounded-md bg-emerald-700 px-3 py-1.5 font-semibold text-white"
            >
              Wear it now
            </button>
            <button
              type="button"
              onClick={() => showTab('wardrobe')}
              className="rounded-md px-3 py-1.5 text-emerald-900 hover:bg-emerald-100"
            >
              Open the wardrobe
            </button>
          </div>
        </div>
      ) : confirm ? (
        <div
          className="rounded-lg bg-slate-50 p-3 text-sm"
          role="group"
          aria-label="Confirm purchase"
        >
          <p>
            Buy the {item.name.toLowerCase()} for{' '}
            <strong>{formatMoney(item.price)}</strong>? You’ll have{' '}
            {formatMoney(life.money - item.price)} left.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const before = new Set(life.wardrobe.owned.map((o) => o.uid))
                void act((p) => {
                  const next = buyAccessory(p, item.id, colour)
                  const added = next.work.life.wardrobe.owned.find(
                    (o) => !before.has(o.uid),
                  )
                  if (added) setBought(added.uid)
                  return next
                })
                setConfirm(false)
              }}
              className="rounded-md bg-slate-900 px-4 py-2 font-semibold text-white"
            >
              Confirm purchase
            </button>
            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!!why}
            onClick={() => setConfirm(true)}
            className="rounded-md bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Buy
          </button>
          <button
            type="button"
            aria-pressed={comparing}
            onClick={onCompare}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            {comparing ? 'Comparing' : 'Compare'}
          </button>
          {why && <p className="w-full text-xs text-rose-700">{why}</p>}
        </div>
      )}
    </aside>
  )
}

function Comparison({
  ids,
  profile,
  onRemove,
}: {
  ids: string[]
  profile: ProfileData
  onRemove: (id: string) => void
}) {
  const items = ids.flatMap((id) => {
    const a = getAccessory(id)
    return a ? [a] : []
  })
  const rows: Array<[string, (a: Accessory) => ReactNode]> = [
    ['Price', (a) => formatMoney(a.price)],
    ['Tier', (a) => TIERS[a.tier]],
    ['Worn on', (a) => SLOT_NAMES[a.slot]],
    ['What it does', (a) => usesOfItem(a).join(' ') || '—'],
    ['For your job', (a) => (a.careers?.includes(profile.careerId) ? 'Yes' : 'No')],
    [
      'Owned',
      (a) => profile.work.life.wardrobe.owned.filter((o) => o.id === a.id).length || 'No',
    ],
  ]
  return (
    <div className="mt-5 overflow-x-auto" data-testid="comparison">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">Side by side</h3>
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead>
          <tr>
            <th className="w-28" />
            {items.map((a) => (
              <th key={a.id} className="px-2 py-1 align-top font-semibold text-slate-900">
                {a.name}
                <button
                  type="button"
                  onClick={() => onRemove(a.id)}
                  className="ml-2 text-xs font-normal text-slate-500 underline"
                >
                  Remove
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, cell]) => (
            <tr key={name} className="border-t border-slate-100">
              <th className="py-1 pr-2 align-top font-normal text-slate-500">{name}</th>
              {items.map((a) => (
                <td key={a.id} className="px-2 py-1 align-top text-slate-800">
                  {cell(a)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WardrobeTab({ profile, act }: { profile: ProfileData; act: Act }) {
  const life = profile.work.life
  const w = life.wardrobe
  const [filter, setFilter] = useState<'all' | 'worn' | 'professional' | Category>('all')
  const [note, setNote] = useState<string | null>(null)
  const [selling, setSelling] = useState<string | null>(null)
  const worn = useMemo(() => wornModels(life), [life])
  const room = capacity(life)
  const owned = w.owned.flatMap((o) => {
    const item = getAccessory(o.id)
    return item ? [{ o, item }] : []
  })
  const shown = owned.filter(({ o, item }) =>
    filter === 'all'
      ? true
      : filter === 'worn'
        ? w.worn.includes(o.uid) || w.packed.includes(o.uid)
        : filter === 'professional'
          ? item.tier === 'professional' || item.category === 'professional'
          : item.category === filter,
  )
  // (The save is changed asynchronously: what happened is said once it has been.)
  const run = async (
    change: (p: ProfileData) => { profile: ProfileData; note: string | null },
  ) => {
    let said: string | null = null
    await act((p) => {
      const r = change(p)
      said = r.note
      return r.profile
    })
    setNote(said)
  }
  const pockets = owned.filter(
    ({ o, item }) => w.worn.includes(o.uid) && item.slot === 'pocket',
  ).length
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[20rem_1fr] md:overflow-hidden">
      <aside className="flex flex-col gap-3 border-b border-slate-200 p-4 md:border-r md:border-b-0">
        <Stage
          label="You, in what you are wearing"
          fit={false}
          target={[0, 0.92, 0]}
          distance={1.4}
        >
          <OnYou wear={worn} />
        </Stage>
        <dl
          className="grid grid-cols-2 gap-1 text-xs text-slate-600"
          data-testid="wardrobe-summary"
        >
          <dt>Wearing</dt>
          <dd className="font-semibold text-slate-900">
            {w.worn.length} {w.worn.length === 1 ? 'thing' : 'things'}
          </dd>
          <dt>In your bag</dt>
          <dd className="font-semibold text-slate-900">
            {room ? `${w.packed.length} of ${room}` : 'No bag on'}
          </dd>
          <dt>Pockets</dt>
          <dd className="font-semibold text-slate-900">
            {pockets} of {POCKETS}
          </dd>
        </dl>
        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer font-semibold text-slate-800">
            Bought and sold ({w.history.length})
          </summary>
          <ul
            className="mt-1 max-h-32 space-y-0.5 overflow-y-auto"
            data-testid="purchase-history"
          >
            {[...w.history].reverse().map((h, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>
                  Day {h.day}: {h.text}
                </span>
                <span className={h.amount < 0 ? 'text-rose-700' : 'text-emerald-700'}>
                  {h.amount < 0 ? '−' : '+'}
                  {formatMoney(Math.abs(h.amount))}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </aside>
      <section aria-label="Your things" className="min-h-0 overflow-y-auto p-4">
        <div className="mb-3 flex flex-wrap gap-1 text-xs" role="group" aria-label="Show">
          {(
            [
              ['all', 'Everything'],
              ['worn', 'On you'],
              ['professional', 'Work kit'],
              ...CATEGORIES.filter((c) => c.id !== 'professional').map(
                (c) => [c.id, c.name] as const,
              ),
            ] as Array<readonly [typeof filter, string]>
          ).map(([id, name]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={`rounded-full px-3 py-1 ${filter === id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              {name}
            </button>
          ))}
        </div>
        {note && (
          <p
            role="status"
            className="mb-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-900"
          >
            {note}
          </p>
        )}
        {owned.length === 0 ? (
          <p className="text-sm text-slate-600">
            Nothing yet.{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => showTab('shop')}
            >
              Visit the shop
            </button>
          </p>
        ) : (
          <ul className="space-y-2">
            {shown.map(({ o, item }) => (
              <OwnedRow
                key={o.uid}
                o={o}
                item={item}
                on={w.worn.includes(o.uid)}
                packed={w.packed.includes(o.uid)}
                selling={selling === o.uid}
                onWear={() => void run((p) => wearAccessory(p, o.uid))}
                onOff={() => {
                  setNote(null)
                  void act((p) => takeOffAccessory(p, o.uid))
                }}
                onPack={() => void run((p) => packAccessory(p, o.uid))}
                onUnpack={() => {
                  setNote(null)
                  void act((p) => unpackAccessory(p, o.uid))
                }}
                onSell={() => setSelling(o.uid)}
                onSellCancel={() => setSelling(null)}
                onSellConfirm={() => {
                  void act((p) => sellAccessory(p, o.uid))
                  setSelling(null)
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function OwnedRow({
  o,
  item,
  on,
  packed,
  selling,
  onWear,
  onOff,
  onPack,
  onUnpack,
  onSell,
  onSellCancel,
  onSellConfirm,
}: {
  o: Owned
  item: Accessory
  on: boolean
  packed: boolean
  selling: boolean
  onWear: () => void
  onOff: () => void
  onPack: () => void
  onUnpack: () => void
  onSell: () => void
  onSellCancel: () => void
  onSellConfirm: () => void
}) {
  const resale = resaleOf(o)
  const btn = 'rounded-md px-2.5 py-1 text-xs font-semibold'
  return (
    <li
      className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3"
      data-testid={`owned-${item.id}`}
      data-state={on ? 'worn' : packed ? 'packed' : 'stored'}
    >
      <span
        aria-hidden
        className="h-8 w-8 shrink-0 rounded-lg ring-1 ring-slate-200"
        style={{ background: item.colours[o.colour] ?? item.colours[0] }}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">
          {item.name}
        </span>
        <span className="block text-xs text-slate-500">
          {SLOT_NAMES[item.slot]} · {conditionWord(o.condition)} (
          {Math.round(o.condition)}%) · bought day {o.bought}
          {on ? ' · wearing' : packed ? ' · in your bag' : ''}
        </span>
      </span>
      {selling ? (
        <span
          className="flex items-center gap-2 text-xs"
          role="group"
          aria-label="Confirm sale"
        >
          Sell for {formatMoney(resale ?? 0)}?
          <button
            type="button"
            onClick={onSellConfirm}
            className={`${btn} bg-rose-700 text-white`}
          >
            Sell
          </button>
          <button
            type="button"
            onClick={onSellCancel}
            className={`${btn} text-slate-700`}
          >
            Keep
          </button>
        </span>
      ) : (
        <span className="flex flex-wrap gap-1.5">
          {on ? (
            <button
              type="button"
              onClick={onOff}
              className={`${btn} bg-slate-100 text-slate-800`}
            >
              {item.slot === 'carry' ? 'Put down' : 'Take off'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onWear}
              className={`${btn} bg-slate-900 text-white`}
            >
              {item.slot === 'carry'
                ? 'Carry'
                : item.slot === 'pocket'
                  ? 'Pocket'
                  : 'Wear'}
            </button>
          )}
          {packable(item) &&
            (packed ? (
              <button
                type="button"
                onClick={onUnpack}
                className={`${btn} bg-slate-100 text-slate-800`}
              >
                Unpack
              </button>
            ) : (
              <button
                type="button"
                onClick={onPack}
                className={`${btn} border border-slate-300 text-slate-700`}
              >
                Pack in bag
              </button>
            ))}
          {resale !== null && (
            <button
              type="button"
              onClick={onSell}
              className={`${btn} text-rose-700 hover:bg-rose-50`}
            >
              Sell ({formatMoney(resale)})
            </button>
          )}
        </span>
      )}
    </li>
  )
}
