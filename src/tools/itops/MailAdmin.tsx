/**
 * Mail Admin: the mail server's console, in the order a diagnosis runs.
 * Message Trace (what happened to the mail), Mailbox Admin (storage, quota,
 * archive) and Inbox Rules (what runs inside a mailbox).
 */
import { useState } from 'react'
import { BUTTON, CARD, INPUT, Pill, PRIMARY, SubTabs, type SectionProps } from './kit'
import {
  deleteRule,
  enableArchive,
  mailboxOf,
  mailboxStatus,
  overQuota,
  setRuleEnabled,
  traceMessages,
} from './model'
import type { Message } from './schema'

type Tab = 'trace' | 'mailbox' | 'rules'

export function MailboxPicker({
  value,
  onChange,
  onGo,
  label,
  addresses,
}: {
  value: string
  onChange: (v: string) => void
  onGo: () => void
  label: string
  addresses: string[]
}) {
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        onGo()
      }}
    >
      <label className="flex flex-col gap-1 text-sm text-slate-700">
        Mailbox
        <input
          className={`${INPUT} w-72`}
          list="itops-mailboxes"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="name@cobaltridge.example"
        />
      </label>
      <datalist id="itops-mailboxes">
        {addresses.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <button type="submit" className={PRIMARY}>
        {label}
      </button>
    </form>
  )
}

function statusCell(m: Message) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Pill
        tone={
          m.status === 'delivered'
            ? 'green'
            : m.status === 'quarantined'
              ? 'amber'
              : m.status === 'pending'
                ? 'blue'
                : 'red'
        }
      >
        {m.status[0].toUpperCase() + m.status.slice(1)}
      </Pill>
      {m.code ? (
        <code className="text-xs text-slate-700">{m.code}</code>
      ) : m.status === 'quarantined' ? (
        <span className="text-xs text-slate-700">SCL {m.scl}</span>
      ) : null}
    </span>
  )
}

export default function MailAdmin(p: SectionProps) {
  const { state } = p
  const [tab, setTab] = useState<Tab>('trace')
  const [input, setInput] = useState('')
  const [box, setBox] = useState<string | null>(null)
  const [hours, setHours] = useState(48)
  const [sender, setSender] = useState('')
  const [ran, setRan] = useState<{ box: string; hours: number; sender: string } | null>(
    null,
  )
  const addresses = state.mailboxes.map((m) => m.address)
  const go = () => {
    const found = mailboxOf(state, input)
    if (!found) {
      p.setFeedback({ problems: [`There is no mailbox “${input}”.`] })
      setBox(null)
      return
    }
    p.setFeedback({ problems: [] })
    setBox(found.address)
    if (tab === 'trace') setRan({ box: found.address, hours, sender })
  }
  const mailbox = box ? mailboxOf(state, box) : undefined
  const rows = ran ? traceMessages(state, ran.box, ran.hours, ran.sender) : []

  return (
    <div className="space-y-4 p-4" data-testid="mail-admin">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Mail Admin</h2>
        <p className="text-sm text-slate-600">
          The console of MAIL01, the company mail server. Trace first, then the mailbox,
          then its rules.
        </p>
      </header>
      <SubTabs
        label="Mail Admin views"
        value={tab}
        onChange={setTab}
        tabs={[
          ['trace', 'Message Trace'],
          ['mailbox', 'Mailbox Admin'],
          ['rules', 'Inbox Rules'],
        ]}
      />
      <div className={`${CARD} space-y-3`}>
        <div className="flex flex-wrap items-end gap-3">
          <MailboxPicker
            value={input}
            onChange={setInput}
            onGo={go}
            addresses={addresses}
            label={
              tab === 'trace'
                ? 'Run mail trace'
                : tab === 'mailbox'
                  ? 'View mailbox'
                  : 'View rules'
            }
          />
          {tab === 'trace' && (
            <>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Time window
                <select
                  className={INPUT}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                >
                  <option value={24}>Last 24 hours</option>
                  <option value={48}>Last 48 hours</option>
                  <option value={168}>Last 7 days</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Sender (optional)
                <input
                  className={INPUT}
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                />
              </label>
            </>
          )}
        </div>
        {tab === 'trace' && ran && (
          <div className="overflow-x-auto">
            <p className="mb-1 text-xs text-slate-600">
              {rows.length} message{rows.length === 1 ? '' : 's'} to {ran.box} in the last{' '}
              {ran.hours === 168 ? '7 days' : `${ran.hours} hours`} (times in UTC)
            </p>
            <table className="w-full text-left text-sm" aria-label="Message trace">
              <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
                <tr>
                  {['Date (UTC)', 'Sender', 'Recipient', 'Subject', 'Status'].map((h) => (
                    <th key={h} className="px-2 py-1.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((m) => (
                  <tr key={m.id} data-testid="trace-row" data-status={m.status}>
                    <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">{m.at}</td>
                    <td className="px-2 py-1.5">{m.from}</td>
                    <td className="px-2 py-1.5">{m.to}</td>
                    <td className="px-2 py-1.5">{m.subject}</td>
                    <td className="px-2 py-1.5">{statusCell(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'mailbox' && mailbox && (
          <div className="space-y-2 text-sm" data-testid="mailbox-admin">
            <p className="font-medium text-slate-900">
              {mailbox.person} · {mailbox.address}
            </p>
            <div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Storage</span>
                <span className="tabular-nums">
                  {mailbox.usedGb.toFixed(2)} of {mailbox.quotaGb} GB
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded bg-slate-200">
                <div
                  className={`h-full ${overQuota(mailbox) ? 'bg-red-600' : mailbox.usedGb >= mailbox.quotaGb * 0.9 ? 'bg-amber-500' : 'bg-teal-600'}`}
                  style={{
                    width: `${Math.min(100, (mailbox.usedGb / mailbox.quotaGb) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-slate-500">Status</dt>
              <dd>
                <Pill
                  tone={
                    overQuota(mailbox)
                      ? 'red'
                      : mailbox.usedGb >= mailbox.quotaGb * 0.9
                        ? 'amber'
                        : 'green'
                  }
                >
                  {mailboxStatus(mailbox)}
                </Pill>
              </dd>
              <dt className="text-slate-500">Online Archive</dt>
              <dd>
                {mailbox.archive
                  ? `Enabled (${mailbox.archivedGb.toFixed(1)} GB archived)`
                  : 'Disabled'}
              </dd>
              <dt className="text-slate-500">Retention policy</dt>
              <dd>{mailbox.retention}</dd>
              <dt className="text-slate-500">Older mail</dt>
              <dd>{mailbox.oldMailGb.toFixed(1)} GB older than 2 years</dd>
            </dl>
            {p.editable && !mailbox.archive && (
              <button
                type="button"
                className={BUTTON}
                onClick={() => p.act((s) => enableArchive(s, mailbox.address))}
              >
                Enable Online Archive
              </button>
            )}
          </div>
        )}
        {tab === 'rules' && mailbox && (
          <div className="space-y-2" data-testid="inbox-rules">
            <p className="text-sm font-medium text-slate-900">
              Inbox rules in {mailbox.address}
            </p>
            {mailbox.rules.length === 0 && (
              <p className="text-sm text-slate-600">No rules.</p>
            )}
            <ul className="space-y-2">
              {mailbox.rules.map((r) => (
                <li
                  key={r.id}
                  className="rounded-md border border-slate-200 p-2 text-sm"
                  data-testid="inbox-rule"
                >
                  <p className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{r.name}</span>
                    <Pill tone={r.enabled ? 'green' : 'slate'}>
                      {r.enabled ? 'On' : 'Off'}
                    </Pill>
                  </p>
                  <p className="text-slate-700">
                    <span className="text-slate-500">If:</span> {r.condition}
                  </p>
                  <p className="text-slate-700">
                    <span className="text-slate-500">Then:</span> {r.action}
                  </p>
                  {p.editable && (
                    <p className="mt-1 flex gap-1.5">
                      <button
                        type="button"
                        className={BUTTON}
                        onClick={() =>
                          p.act((s) =>
                            setRuleEnabled(s, mailbox.address, r.id, !r.enabled),
                          )
                        }
                      >
                        {r.enabled ? 'Turn off' : 'Turn on'}
                      </button>
                      <button
                        type="button"
                        className={BUTTON}
                        onClick={() => p.act((s) => deleteRule(s, mailbox.address, r.id))}
                      >
                        Delete
                      </button>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
