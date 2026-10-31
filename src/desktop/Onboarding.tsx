/** The first screen for a new player: what WorkSim is, and their name. */
import { useState, type FormEvent } from 'react'
import { COMPANY } from '../content/company'

export function Onboarding({ onStart }: { onStart: (name: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setStarting(true)
    setError(null)
    try {
      await onStart(name.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStarting(false)
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 p-6"
      data-testid="onboarding"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <p className="text-sm font-semibold tracking-wide text-blue-700 uppercase">
          GamHub WorkSim
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Your first day at {COMPANY.name}
        </h1>
        <p className="mt-3 text-slate-700">
          You are joining the Finance &amp; Administration team as an intern. Your manager
          will send you real-world tasks: pricing orders, summarising expenses, checking
          invoices. You do them in a working spreadsheet, get instant feedback, and build
          skills you can use in a real job.
        </p>

        <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          {[
            ['Realistic work', 'Tasks, data and emails like a real office.'],
            ['Learn as you go', 'Step-by-step help and clear feedback on every task.'],
            ['Grow your career', 'Earn XP, build skills and get promoted.'],
          ].map(([title, text]) => (
            <li key={title} className="rounded-lg bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">{title}</p>
              <p className="mt-0.5 text-slate-600">{text}</p>
            </li>
          ))}
        </ul>

        <form onSubmit={(event) => void submit(event)} className="mt-8">
          <label htmlFor="player-name" className="block font-medium text-slate-800">
            Your first name
          </label>
          <p className="text-sm text-slate-500">
            This is what your colleagues will call you.
          </p>
          <div className="mt-2 flex gap-3">
            <input
              id="player-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              autoFocus
              autoComplete="given-name"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!name.trim() || starting}
              className="rounded-md bg-blue-700 px-5 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {starting ? 'Starting…' : 'Start my first day'}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </form>

        <p className="mt-6 text-xs text-slate-500">
          Your progress is saved automatically in this browser. To keep a copy somewhere
          safe, use “Storage &amp; backup” at any time.
        </p>
      </div>
    </div>
  )
}
