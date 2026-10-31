/** Form controls shared by the Books screens. */
import { useState, type ReactNode } from 'react'
import { ACCOUNT_TYPES, type Account, type AccountType } from './schema'
import { TYPE_NAMES } from './styles'

export function Heading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function Problems({ problems }: { problems: string[] }) {
  if (problems.length === 0) return null
  return (
    <ul
      className="mt-2 list-disc rounded-md bg-red-50 p-3 pl-7 text-sm text-red-800"
      role="alert"
    >
      {problems.map((p) => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  )
}

export function Badge({
  tone,
  children,
}: {
  tone: 'green' | 'amber' | 'red' | 'slate' | 'blue'
  children: ReactNode
}) {
  const tones = {
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-800',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

/** A number box that commits when the player leaves it (one undo step per edit). */
export function NumberInput({
  value,
  onCommit,
  label,
  disabled = false,
  decimals = 2,
  className = 'w-24',
  allowZero = true,
}: {
  value: number
  onCommit: (value: number) => void
  label: string
  disabled?: boolean
  decimals?: number
  className?: string
  allowZero?: boolean
}) {
  const show = (n: number) => (n === 0 && allowZero ? '' : n.toFixed(decimals))
  const [text, setText] = useState(show(value))
  const commit = () => {
    const parsed = Number(text.replace(/[£,%\s]/g, '') || '0')
    if (Number.isFinite(parsed) && parsed >= 0) {
      const rounded = Math.round(parsed * 10 ** decimals) / 10 ** decimals
      if (rounded !== value) onCommit(rounded)
      else setText(show(value))
    } else {
      setText(show(value))
    }
  }
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={text}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className={`rounded border border-slate-300 px-2 py-1 text-right tabular-nums disabled:border-transparent disabled:bg-transparent ${className}`}
    />
  )
}

export function TextInput({
  value,
  onCommit,
  label,
  disabled = false,
  className = '',
  type = 'text',
  placeholder,
}: {
  value: string
  onCommit: (value: string) => void
  label: string
  disabled?: boolean
  className?: string
  type?: 'text' | 'date' | 'month'
  placeholder?: string
}) {
  const [text, setText] = useState(value)
  return (
    <input
      aria-label={label}
      type={type}
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => {
        setText(e.target.value)
        if (type !== 'text') onCommit(e.target.value)
      }}
      onBlur={() => type === 'text' && text !== value && onCommit(text)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className={`rounded border border-slate-300 px-2 py-1 disabled:border-transparent disabled:bg-transparent ${className}`}
    />
  )
}

export function AccountSelect({
  accounts,
  value,
  onChange,
  label,
  disabled = false,
  types = ACCOUNT_TYPES,
  className = 'w-56',
}: {
  accounts: Account[]
  value: string
  onChange: (code: string) => void
  label: string
  disabled?: boolean
  types?: readonly AccountType[]
  className?: string
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded border border-slate-300 px-2 py-1 disabled:border-transparent disabled:bg-transparent disabled:text-slate-900 disabled:opacity-100 ${className}`}
    >
      <option value="">Choose an account…</option>
      {types.map((type) => (
        <optgroup key={type} label={TYPE_NAMES[type]}>
          {accounts
            .filter((a) => a.type === type)
            .map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} {a.name}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  )
}
