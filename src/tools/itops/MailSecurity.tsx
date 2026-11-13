/**
 * Mail Security: the filter in front of the mail server. Review a mailbox's
 * quarantine (release only what is genuine) and the company-wide blocked
 * senders (remove an entry only with a reason; block real threats).
 */
import { useState } from 'react'
import { BUTTON, CARD, INPUT, Pill, SubTabs, type SectionProps } from './kit'
import { MailboxPicker } from './MailAdmin'
import {
  blockSender,
  mailboxOf,
  releaseMessage,
  removeBlocked,
  undoRelease,
} from './model'

export default function MailSecurity(p: SectionProps) {
  const { state } = p
  const [input, setInput] = useState('')
  const [box, setBox] = useState<string | null>(null)
  const [tab, setTab] = useState<'quarantine' | 'blocked'>('quarantine')
  const [newBlock, setNewBlock] = useState('')
  const [reason, setReason] = useState<'phishing' | 'malware' | 'bulk' | 'manual'>(
    'phishing',
  )
  const held = box
    ? state.messages.filter(
        (m) => m.to === box && (m.status === 'quarantined' || m.released),
      )
    : []

  return (
    <div className="space-y-4 p-4" data-testid="mail-security">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Mail Security</h2>
        <p className="text-sm text-slate-600">
          Inbound mail is filtered before it reaches MAIL01. Read the sender before the
          subject: the ones that matter are the genuine messages held by mistake, and the
          dangerous ones that look genuine.
        </p>
      </header>
      <SubTabs
        label="Mail Security views"
        value={tab}
        onChange={setTab}
        tabs={[
          ['quarantine', 'Quarantine'],
          ['blocked', `Blocked senders (${state.blocked.length})`],
        ]}
      />
      {tab === 'quarantine' ? (
        <div className={`${CARD} space-y-3`}>
          <MailboxPicker
            value={input}
            onChange={setInput}
            label="Review"
            addresses={state.mailboxes.map((m) => m.address)}
            onGo={() => {
              const found = mailboxOf(state, input)
              p.setFeedback(
                found
                  ? { problems: [] }
                  : { problems: [`There is no mailbox “${input}”.`] },
              )
              setBox(found?.address ?? null)
            }}
          />
          {box && (
            <div className="overflow-x-auto">
              <p className="mb-1 text-xs text-slate-600">
                {held.length} message{held.length === 1 ? '' : 's'} held for {box}
              </p>
              <table className="w-full text-left text-sm" aria-label="Quarantine">
                <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
                  <tr>
                    {['Received (UTC)', 'Sender', 'Subject', 'Spam score', ''].map(
                      (h) => (
                        <th key={h} className="px-2 py-1.5 font-medium">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {held.map((m) => (
                    <tr key={m.id} data-testid="quarantine-row" data-id={m.id}>
                      <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">
                        {m.at}
                      </td>
                      <td className="px-2 py-1.5">{m.from}</td>
                      <td className="px-2 py-1.5">{m.subject}</td>
                      <td className="px-2 py-1.5">
                        <Pill tone={m.scl >= 8 ? 'red' : m.scl >= 5 ? 'amber' : 'slate'}>
                          SCL {m.scl}
                        </Pill>
                      </td>
                      <td className="px-2 py-1.5">
                        {p.editable &&
                          (m.released ? (
                            <button
                              type="button"
                              className={BUTTON}
                              onClick={() => p.act((s) => undoRelease(s, m.id))}
                            >
                              Undo
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={BUTTON}
                              onClick={() =>
                                p.act(
                                  (s) => releaseMessage(s, m.id),
                                  'Released to the mailbox.',
                                )
                              }
                              aria-label={`Release ${m.subject}`}
                            >
                              Release
                            </button>
                          ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className={`${CARD} space-y-3`}>
          <table className="w-full text-left text-sm" aria-label="Blocked senders">
            <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
              <tr>
                {['Address or domain', 'Reason', 'Note', 'Added', ''].map((h) => (
                  <th key={h} className="px-2 py-1.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.blocked.map((b) => (
                <tr key={b.address} data-testid="blocked-row" data-address={b.address}>
                  <td className="px-2 py-1.5 font-mono">{b.address}</td>
                  <td className="px-2 py-1.5">
                    <Pill
                      tone={
                        b.reason === 'phishing' || b.reason === 'malware'
                          ? 'red'
                          : b.reason === 'bulk'
                            ? 'amber'
                            : 'slate'
                      }
                    >
                      {b.reason === 'manual'
                        ? 'Manually blocked'
                        : b.reason === 'bulk'
                          ? 'Bulk / spam'
                          : b.reason[0].toUpperCase() + b.reason.slice(1)}
                    </Pill>
                  </td>
                  <td className="px-2 py-1.5">{b.note}</td>
                  <td className="px-2 py-1.5 tabular-nums">{b.added}</td>
                  <td className="px-2 py-1.5">
                    {p.editable && (
                      <button
                        type="button"
                        className={BUTTON}
                        onClick={() => p.act((s) => removeBlocked(s, b.address))}
                        aria-label={`Remove ${b.address}`}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {p.editable && (
            <form
              className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3"
              onSubmit={(e) => {
                e.preventDefault()
                const r = p.act(
                  (s) => blockSender(s, newBlock, reason, ''),
                  `${newBlock} is blocked for everyone.`,
                )
                if (!r.problems.length) setNewBlock('')
              }}
            >
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Block a sender or domain
                <input
                  className={`${INPUT} w-72`}
                  value={newBlock}
                  onChange={(e) => setNewBlock(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Reason
                <select
                  className={INPUT}
                  value={reason}
                  onChange={(e) => setReason(e.target.value as typeof reason)}
                >
                  <option value="phishing">Phishing</option>
                  <option value="malware">Malware</option>
                  <option value="bulk">Bulk / spam</option>
                  <option value="manual">Other</option>
                </select>
              </label>
              <button type="submit" className={BUTTON}>
                Block
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
