/**
 * Ship Manager: send hardware to someone who works from home. Who it is
 * for, where they really are (ask them: the address on file can be out of
 * date), what goes in the box, how fast, and the return label for the old
 * equipment. Parcels in transit count down; the delivery is a real event.
 */
import { useEffect, useState } from 'react'
import { BUTTON, CARD, INPUT, Pill, PRIMARY, type SectionProps } from './kit'
import { BUILD_NAMES } from './deployment'
import {
  confirmAddress,
  deliveryFeedback,
  EQUIPMENT_NAMES,
  formatAddress,
  personById,
  returnAddress,
  ship,
  shelfUnits,
  SPEEDS,
} from './model'
import {
  EQUIPMENT,
  SHIP_SPEEDS,
  type Address,
  type Equipment,
  type ShipSpeed,
} from './schema'

const EMPTY: Address = { street: '', city: '', region: '', postal: '' }

export default function ShipManager(p: SectionProps) {
  const { state } = p
  const [to, setTo] = useState('')
  const [address, setAddress] = useState<Address>(EMPTY)
  const [items, setItems] = useState<Equipment[]>([])
  const [unit, setUnit] = useState('')
  const [speed, setSpeed] = useState<ShipSpeed>('express')
  const [returnLabel, setReturnLabel] = useState(false)
  const [returnTo, setReturnTo] = useState<'it' | 'warehouse' | ''>('')
  const [reference, setReference] = useState('')
  const [suggestion, setSuggestion] = useState<Address | null>(null)
  const person = to ? personById(state, to) : undefined
  const confirmed = state.confirmations.find((c) => c.person === to)
  const units = shelfUnits(state).filter((u) => u.status !== 'needs-image')
  const [, setTick] = useState(0)
  const moving = state.shipments.some((s) => s.status === 'in-transit')
  useEffect(() => {
    if (!moving) return
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [moving])
  const now = p.now()

  const field = (k: keyof Address, label: string) => (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      {label}
      <input
        className={INPUT}
        value={address[k]}
        onChange={(e) => setAddress((a) => ({ ...a, [k]: e.target.value }))}
      />
    </label>
  )

  const send = () => {
    const r = p.act(
      (s) =>
        ship(
          s,
          {
            to,
            address,
            items,
            unit: items.includes('computer') ? unit || null : null,
            speed,
            returnLabel,
            returnTo: returnLabel && returnTo ? returnTo : null,
            reference: reference || null,
          },
          now,
        ),
      'Shipment sent: the courier has it.',
    )
    setSuggestion(r.suggestion ?? null)
    if (!r.problems.length) {
      setItems([])
      setUnit('')
      setReturnLabel(false)
      setReturnTo('')
    }
  }

  return (
    <div className="space-y-4 p-4" data-testid="ship-manager">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Ship Manager</h2>
        <p className="text-sm text-slate-600">
          Send hardware to someone who works from home, booked against their ticket.
        </p>
      </header>
      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          aria-label="Shipment"
        >
          <section className={`${CARD} space-y-3`} aria-label="Recipient information">
            <h3 className="font-semibold text-slate-900">Recipient</h3>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Recipient name
              <select
                className={INPUT}
                value={to}
                onChange={(e) => {
                  setTo(e.target.value)
                  setSuggestion(null)
                }}
              >
                <option value="">Choose from the staff list…</option>
                {state.people.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} · {x.department}
                    {x.remote ? ' · remote' : ''}
                  </option>
                ))}
              </select>
            </label>
            {person && (
              <div className="rounded-md bg-slate-50 p-2 text-xs text-slate-700">
                <p>
                  Address on file (from HR):{' '}
                  {person.addressOnFile
                    ? formatAddress(person.addressOnFile)
                    : 'none (works in the office)'}
                </p>
                {confirmed ? (
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-emerald-900">
                    Confirmed by {person.name.split(' ')[0]}
                    {confirmed.time ? ` at ${confirmed.time}` : ''}:{' '}
                    {formatAddress(confirmed.address)}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => setAddress(confirmed.address)}
                    >
                      Use this address
                    </button>
                  </p>
                ) : (
                  <button
                    type="button"
                    className={`${BUTTON} mt-1`}
                    disabled={!p.editable}
                    onClick={() => p.act((s) => confirmAddress(s, to, p.officeTime()))}
                  >
                    Message {person.name.split(' ')[0]} to confirm where to send it
                  </button>
                )}
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {field('street', 'Street address')}
              {field('city', 'City')}
              {field('region', 'State')}
              {field('postal', 'Postal code')}
            </div>
            {suggestion && (
              <p className="flex flex-wrap items-center gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-950">
                Address lookup found a matching record: {formatAddress(suggestion)}
                <button
                  type="button"
                  className={BUTTON}
                  onClick={() => {
                    setAddress(suggestion)
                    setSuggestion(null)
                  }}
                >
                  Use this address
                </button>
              </p>
            )}
          </section>
          <section className={`${CARD} space-y-3`} aria-label="Package details">
            <h3 className="font-semibold text-slate-900">Package</h3>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Reference (the ticket this shipment is for)
              <select
                className={INPUT}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              >
                <option value="">No ticket</option>
                {p.tickets
                  .filter((t) => t.open)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id}: {t.title}
                    </option>
                  ))}
              </select>
            </label>
            <fieldset>
              <legend className="mb-1 text-sm text-slate-700">Equipment to ship</legend>
              <div className="grid gap-1 sm:grid-cols-2">
                {EQUIPMENT.map((e) => (
                  <label key={e} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={items.includes(e)}
                      onChange={() =>
                        setItems((x) =>
                          x.includes(e) ? x.filter((y) => y !== e) : [...x, e],
                        )
                      }
                    />
                    {EQUIPMENT_NAMES[e]}
                    {e === 'computer' ? ` (${units.length} on the shelf)` : ''}
                  </label>
                ))}
              </div>
            </fieldset>
            {items.includes('computer') &&
              (units.length ? (
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Select a computer to ship
                  <select
                    className={INPUT}
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="">Choose a unit…</option>
                    {units.map((u) => (
                      <option key={u.tag} value={u.tag}>
                        {u.hostname ?? u.tag} · {u.type} ·{' '}
                        {u.build ? BUILD_NAMES[u.build] : 'no build'}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="flex items-center gap-2 text-sm text-amber-900">
                  The shelf is empty: the machine has to be built first.
                  <button
                    type="button"
                    className={BUTTON}
                    onClick={() => p.open('deployment')}
                  >
                    Open Computer Deployment
                  </button>
                </p>
              ))}
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Shipping speed
              <select
                className={INPUT}
                value={speed}
                onChange={(e) => setSpeed(e.target.value as ShipSpeed)}
              >
                {SHIP_SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {SPEEDS[s].name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={returnLabel}
                onChange={() => setReturnLabel((r) => !r)}
              />
              Include a prepaid return label
            </label>
            {returnLabel && (
              <div className="grid gap-2 rounded-md bg-slate-50 p-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Returning to
                  <select
                    className={INPUT}
                    value={returnTo}
                    onChange={(e) =>
                      setReturnTo(e.target.value as 'it' | 'warehouse' | '')
                    }
                  >
                    <option value="">Choose…</option>
                    <option value="it">IT department</option>
                    <option value="warehouse">Central warehouse</option>
                  </select>
                </label>
                <p className="text-xs text-slate-700">
                  Prepaid label ships to:
                  <br />
                  {returnTo ? formatAddress(returnAddress(returnTo)) : '—'}
                </p>
              </div>
            )}
          </section>
          <button type="submit" className={PRIMARY} disabled={!p.editable}>
            Ship
          </button>
        </form>
        <section className={`${CARD} h-fit space-y-2`} aria-label="Shipments">
          <h3 className="font-semibold text-slate-900">Shipments</h3>
          {state.shipments.length === 0 && (
            <p className="text-sm text-slate-600">Nothing sent yet.</p>
          )}
          <ul className="space-y-2">
            {[...state.shipments].reverse().map((s) => {
              const left = Math.max(0, Math.ceil((s.arrivesAt - now) / 1000))
              const feedback = deliveryFeedback(state, s.id)
              return (
                <li
                  key={s.id}
                  className="rounded-md border border-slate-200 p-2 text-sm"
                  data-testid="shipment"
                  data-status={s.status}
                >
                  <p className="flex items-center justify-between gap-2">
                    <span className="font-mono font-medium">{s.id}</span>
                    {s.status === 'delivered' ? (
                      <Pill tone="green">Delivered</Pill>
                    ) : (
                      <Pill tone="blue">In transit · {left}s</Pill>
                    )}
                  </p>
                  <p className="text-slate-700">
                    {personById(state, s.to)?.name} ·{' '}
                    {s.items.map((i) => EQUIPMENT_NAMES[i]).join(', ')}
                  </p>
                  <p className="text-xs text-slate-600">
                    {SPEEDS[s.speed].name}
                    {s.returnLabel ? ' · return label' : ''}
                    {s.reference ? ` · ref ${s.reference}` : ''}
                  </p>
                  {feedback && (
                    <p className="mt-1 rounded bg-slate-50 p-1.5 text-xs text-slate-800">
                      {feedback}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
