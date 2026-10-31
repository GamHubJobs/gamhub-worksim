/**
 * Mail: messages from colleagues. Tasks arrive here; so does feedback. The
 * player can reply with files attached: replying to a task email with the
 * finished work hands it in.
 */
import { useEffect, useState } from 'react'
import type { SubmissionResult } from '../../app/useCareer'
import { getAssignment } from '../../content/assignments'
import { COMPANY } from '../../content/company'
import { getPerson } from '../../content/departments'
import { firstName } from '../../game/career'
import { formatDateTime } from '../../lib/time'
import { listDocuments } from '../../persistence/documentsRepo'
import type { AnyDocument, MailMessage, Profile } from '../../persistence/schemas'
import { Avatar } from '../../ui/Avatar'
import { Icon, type IconName } from '../../ui/Icon'
import { RichText } from '../../ui/RichText'
import { visibleTo } from '../shared/ownership'
import { SubmissionResults } from '../tasks/SubmissionResults'

export interface Attachment {
  documentId: string
  kind: 'sheet' | 'doc' | 'slides' | 'tickets' | 'code'
  title: string
}

interface MailAppProps {
  profile: Profile
  selectedId: string | undefined
  /** Open the reply form for the selected message. */
  composing: boolean
  onSelect: (mailId: string, compose?: boolean) => void
  onMarkRead: (mailId: string) => void
  onOpenTask: (assignmentId: string) => void
  onOpenCareer: () => void
  /** Saves all open files before sending, so attachments are up to date. */
  onFlush: () => Promise<boolean>
  onSend: (input: {
    replyTo: MailMessage
    body: string
    attachments: Attachment[]
  }) => Promise<SubmissionResult | null>
}

const KIND_ICONS: Record<Attachment['kind'], IconName> = {
  sheet: 'sheets',
  doc: 'docs',
  slides: 'slides',
  tickets: 'helpdesk',
  code: 'code',
}

const KIND_NAMES: Record<Attachment['kind'], string> = {
  sheet: 'Workbook',
  doc: 'Document',
  slides: 'Presentation',
  tickets: 'Ticket queue',
  code: 'Code project',
}

function preview(body: string): string {
  return body
    .replace(/^Hi [^\n]+\n+/, '')
    .replace(/\s+/g, ' ')
    .slice(0, 90)
}

export function MailApp({
  profile,
  selectedId,
  composing,
  onSelect,
  onMarkRead,
  onOpenTask,
  onOpenCareer,
  onFlush,
  onSend,
}: MailAppProps) {
  const [folder, setFolder] = useState<'inbox' | 'sent'>(() =>
    profile.inbox.find((m) => m.id === selectedId)?.kind === 'sent' ? 'sent' : 'inbox',
  )
  const messages = [...profile.inbox]
    .filter((m) => (folder === 'sent' ? m.kind === 'sent' : m.kind !== 'sent'))
    .sort((a, b) => b.receivedAt - a.receivedAt)
  const selected = messages.find((m) => m.id === selectedId) ?? messages[0]
  const [result, setResult] = useState<SubmissionResult | null>(null)

  // Opening a message marks it as read.
  useEffect(() => {
    if (selected && selected.readAt === null) onMarkRead(selected.id)
  }, [selected, onMarkRead])

  const resultAssignment = result ? getAssignment(result.assignmentId) : undefined

  return (
    <div className="flex h-full min-h-0">
      <div className="flex w-96 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div
          className="flex items-center gap-1 border-b border-slate-200 px-3 py-2"
          role="tablist"
        >
          {(['inbox', 'sent'] as const).map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={folder === name}
              onClick={() => setFolder(name)}
              className={`rounded px-3 py-1 text-sm ${
                folder === name
                  ? 'bg-blue-50 font-semibold text-blue-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {name === 'inbox' ? 'Inbox' : 'Sent'}
            </button>
          ))}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Messages">
          {messages.length === 0 && (
            <li className="p-4 text-sm text-slate-500">
              {folder === 'sent' ? 'Messages you send appear here.' : 'No messages.'}
            </li>
          )}
          {messages.map((mail) => {
            const sent = mail.kind === 'sent'
            const person = getPerson(sent ? (mail.to ?? 'manager') : mail.from)
            const unread = mail.readAt === null
            return (
              <li key={mail.id}>
                <button
                  type="button"
                  onClick={() => onSelect(mail.id)}
                  aria-current={selected?.id === mail.id}
                  className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left ${
                    selected?.id === mail.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <Avatar personId={person.id} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate text-sm ${unread ? 'font-semibold text-slate-900' : 'text-slate-700'}`}
                      >
                        {sent ? `To: ${person.name}` : person.name}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {formatDateTime(mail.receivedAt)}
                      </span>
                    </div>
                    <p
                      className={`truncate text-sm ${unread ? 'font-semibold text-slate-900' : 'text-slate-700'}`}
                    >
                      {unread && (
                        <span
                          className="mr-1.5 inline-block h-2 w-2 rounded-full bg-blue-600"
                          aria-label="Unread"
                        />
                      )}
                      {mail.attachments?.length ? (
                        <Icon name="attach" className="mr-1 inline h-3.5 w-3.5" />
                      ) : null}
                      {mail.subject}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {preview(mail.body)}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto bg-white">
        {selected && composing && selected.kind !== 'sent' ? (
          <Compose
            key={selected.id}
            replyTo={selected}
            profile={profile}
            onCancel={() => onSelect(selected.id)}
            onFlush={onFlush}
            onSend={async (input) => {
              const outcome = await onSend(input)
              setFolder('sent')
              // Show the newest sent message (the one just sent).
              onSelect('')
              if (outcome) setResult(outcome)
            }}
          />
        ) : selected ? (
          <MessageView
            mail={selected}
            playerName={profile.name}
            onReply={() => onSelect(selected.id, true)}
            onOpenTask={onOpenTask}
            onOpenCareer={onOpenCareer}
          />
        ) : (
          <p className="p-6 text-slate-500">No messages.</p>
        )}
      </div>

      {result && resultAssignment && (
        <SubmissionResults
          assignment={resultAssignment}
          result={result}
          closeLabel="Close"
          onClose={() => setResult(null)}
          onOpenTask={(id) => {
            setResult(null)
            onOpenTask(id)
          }}
        />
      )}
    </div>
  )
}

function MessageView({
  mail,
  playerName,
  onReply,
  onOpenTask,
  onOpenCareer,
}: {
  mail: MailMessage
  playerName: string
  onReply: () => void
  onOpenTask: (assignmentId: string) => void
  onOpenCareer: () => void
}) {
  const sent = mail.kind === 'sent'
  const sender = sent ? null : getPerson(mail.from)
  const recipient = getPerson(sent ? (mail.to ?? 'manager') : 'manager')
  const assignment = mail.assignmentId ? getAssignment(mail.assignmentId) : undefined

  return (
    <article className="mx-auto max-w-3xl p-6" data-testid="mail-message">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-semibold text-slate-900">{mail.subject}</h2>
        {!sent && mail.from !== 'hr' && (
          <button
            type="button"
            onClick={onReply}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Icon name="send" className="h-4 w-4" /> Reply
          </button>
        )}
      </div>
      <div className="mt-4 flex items-center gap-3">
        {sender ? <Avatar personId={sender.id} /> : <Avatar personId={recipient.id} />}
        <div className="text-sm">
          {sender ? (
            <>
              <p className="font-medium text-slate-900">
                {sender.name}{' '}
                <span className="font-normal text-slate-500">&lt;{sender.email}&gt;</span>
              </p>
              <p className="text-slate-500">
                {sender.role} · to {firstName(playerName)} ·{' '}
                {formatDateTime(mail.receivedAt)}
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-slate-900">
                You → {recipient.name}{' '}
                <span className="font-normal text-slate-500">
                  &lt;{recipient.email}&gt;
                </span>
              </p>
              <p className="text-slate-500">Sent {formatDateTime(mail.receivedAt)}</p>
            </>
          )}
        </div>
      </div>
      <RichText
        text={mail.body || '(No message)'}
        className="mt-6 leading-relaxed text-slate-800"
      />

      {mail.attachments && mail.attachments.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Attachments">
          {mail.attachments.map((file) => (
            <li
              key={file.documentId}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm"
            >
              <Icon name={KIND_ICONS[file.kind]} className="h-4 w-4 text-slate-500" />
              {file.title}
            </li>
          ))}
        </ul>
      )}

      {assignment && !sent && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-blue-700 uppercase">
              {mail.kind === 'feedback' ? 'Feedback' : 'Task'}
            </p>
            <p className="font-medium text-slate-900">{assignment.title}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenTask(assignment.id)}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            {mail.kind === 'feedback' ? 'See detailed feedback' : 'Open task'}
          </button>
        </div>
      )}
      {(mail.kind === 'promotion' || mail.kind === 'review') && (
        <button
          type="button"
          onClick={onOpenCareer}
          className="mt-6 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          View my career
        </button>
      )}
      <p className="mt-10 border-t border-slate-100 pt-3 text-xs text-slate-400">
        {COMPANY.name} internal mail
      </p>
    </article>
  )
}

/** Writing a reply, with files attached. */
function Compose({
  replyTo,
  profile,
  onCancel,
  onFlush,
  onSend,
}: {
  replyTo: MailMessage
  profile: Profile
  onCancel: () => void
  onFlush: () => Promise<boolean>
  onSend: (input: {
    replyTo: MailMessage
    body: string
    attachments: Attachment[]
  }) => Promise<void>
}) {
  const recipient = getPerson(replyTo.from)
  const assignment = replyTo.assignmentId
    ? getAssignment(replyTo.assignmentId)
    : undefined
  const progress = assignment ? profile.assignments[assignment.id] : undefined
  const handingIn = !!assignment && !!progress
  const [body, setBody] = useState(
    handingIn
      ? `Hi ${recipient.name.split(' ')[0]},\n\nPlease find my work attached.\n\nThanks,\n${firstName(profile.name)}`
      : `Hi ${recipient.name.split(' ')[0]},\n\n`,
  )
  const [files, setFiles] = useState<AnyDocument[] | null>(null)
  const [attached, setAttached] = useState<string[]>(() =>
    progress
      ? [progress.documentId, progress.files?.doc, progress.files?.slides].filter(
          (id): id is string => !!id,
        )
      : [],
  )
  const [picking, setPicking] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void listDocuments().then((all) => {
      if (active) setFiles(all.filter(visibleTo(profile.id)))
    })
    return () => {
      active = false
    }
  }, [profile.id])

  const attachments: Attachment[] = attached.flatMap((id) => {
    const file = files?.find((f) => f.id === id)
    return file ? [{ documentId: file.id, kind: file.kind, title: file.title }] : []
  })

  async function send() {
    setSending(true)
    setError(null)
    try {
      if (!(await onFlush())) {
        throw new Error(
          'Some of your changes could not be saved yet, so nothing was sent. Please try again in a moment.',
        )
      }
      await onSend({ replyTo, body: body.trim(), attachments })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSending(false)
    }
  }

  return (
    <form
      className="mx-auto max-w-3xl space-y-4 p-6"
      data-testid="compose"
      onSubmit={(event) => {
        event.preventDefault()
        void send()
      }}
    >
      <h2 className="text-xl font-semibold text-slate-900">Reply</h2>
      <dl className="space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="w-16 text-slate-500">To</dt>
          <dd className="font-medium text-slate-900">
            {recipient.name} &lt;{recipient.email}&gt;
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 text-slate-500">Subject</dt>
          <dd className="text-slate-900">
            {replyTo.subject.startsWith('Re:')
              ? replyTo.subject
              : `Re: ${replyTo.subject}`}
          </dd>
        </div>
      </dl>
      <textarea
        aria-label="Message"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={8}
        className="w-full rounded-md border border-slate-300 p-3 text-sm leading-relaxed"
      />

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Attachments</h3>
          <button
            type="button"
            onClick={() => setPicking((open) => !open)}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-50"
          >
            <Icon name="attach" className="h-4 w-4" /> Attach files
          </button>
        </div>
        {attachments.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">No files attached.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Attached files">
            {attachments.map((file) => (
              <li
                key={file.documentId}
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm"
              >
                <Icon name={KIND_ICONS[file.kind]} className="h-4 w-4 text-slate-500" />
                {file.title}
                <button
                  type="button"
                  aria-label={`Remove ${file.title}`}
                  onClick={() =>
                    setAttached((ids) => ids.filter((id) => id !== file.documentId))
                  }
                  className="text-slate-400 hover:text-red-600"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {picking && (
          <ul
            className="mt-2 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200"
            aria-label="Your files"
          >
            {(files ?? []).map((file) => (
              <li key={file.id}>
                <label className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={attached.includes(file.id)}
                    onChange={() =>
                      setAttached((ids) =>
                        ids.includes(file.id)
                          ? ids.filter((id) => id !== file.id)
                          : [...ids, file.id],
                      )
                    }
                  />
                  <Icon name={KIND_ICONS[file.kind]} className="h-4 w-4 text-slate-500" />
                  <span className="flex-1">{file.title}</span>
                  <span className="text-xs text-slate-400">{KIND_NAMES[file.kind]}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      {handingIn && (
        <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
          Sending this hands in your work for “{assignment.title}”. The attached files are
          checked straight away, and {recipient.name.split(' ')[0]} replies with feedback.
          You can improve your work and send it again.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Discard
        </button>
        <button
          type="submit"
          disabled={sending}
          className="flex items-center gap-1.5 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          <Icon name="send" className="h-4 w-4" /> {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  )
}
