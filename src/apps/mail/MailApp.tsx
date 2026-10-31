/** Mail: messages from colleagues. Tasks arrive here; so does feedback. */
import { useEffect } from 'react'
import { getAssignment } from '../../content/assignments'
import { COMPANY, getPerson } from '../../content/company'
import { firstName } from '../../game/career'
import { formatDateTime } from '../../lib/time'
import type { MailMessage, Profile } from '../../persistence/schemas'
import { Avatar } from '../../ui/Avatar'
import { RichText } from '../../ui/RichText'

interface MailAppProps {
  profile: Profile
  selectedId: string | undefined
  onSelect: (mailId: string) => void
  onMarkRead: (mailId: string) => void
  onOpenTask: (assignmentId: string) => void
  onOpenCareer: () => void
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
  onSelect,
  onMarkRead,
  onOpenTask,
  onOpenCareer,
}: MailAppProps) {
  const messages = [...profile.inbox].sort((a, b) => b.receivedAt - a.receivedAt)
  const selected = messages.find((m) => m.id === selectedId) ?? messages[0]

  // Opening a message marks it as read.
  useEffect(() => {
    if (selected && selected.readAt === null) onMarkRead(selected.id)
  }, [selected, onMarkRead])

  return (
    <div className="flex h-full min-h-0">
      <div className="flex w-96 shrink-0 flex-col border-r border-slate-200 bg-white">
        <h1 className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-900">
          Inbox
        </h1>
        <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Messages">
          {messages.map((mail) => {
            const sender = getPerson(mail.from)
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
                  <Avatar personId={mail.from} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate text-sm ${unread ? 'font-semibold text-slate-900' : 'text-slate-700'}`}
                      >
                        {sender.name}
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
        {selected ? (
          <MessageView
            mail={selected}
            playerName={profile.name}
            onOpenTask={onOpenTask}
            onOpenCareer={onOpenCareer}
          />
        ) : (
          <p className="p-6 text-slate-500">No messages.</p>
        )}
      </div>
    </div>
  )
}

function MessageView({
  mail,
  playerName,
  onOpenTask,
  onOpenCareer,
}: {
  mail: MailMessage
  playerName: string
  onOpenTask: (assignmentId: string) => void
  onOpenCareer: () => void
}) {
  const sender = getPerson(mail.from)
  const assignment = mail.assignmentId ? getAssignment(mail.assignmentId) : undefined

  return (
    <article className="mx-auto max-w-3xl p-6" data-testid="mail-message">
      <h2 className="text-xl font-semibold text-slate-900">{mail.subject}</h2>
      <div className="mt-4 flex items-center gap-3">
        <Avatar personId={mail.from} />
        <div className="text-sm">
          <p className="font-medium text-slate-900">
            {sender.name}{' '}
            <span className="font-normal text-slate-500">&lt;{sender.email}&gt;</span>
          </p>
          <p className="text-slate-500">
            {sender.role} · to {firstName(playerName)} · {formatDateTime(mail.receivedAt)}
          </p>
        </div>
      </div>
      <RichText text={mail.body} className="mt-6 leading-relaxed text-slate-800" />

      {assignment && (
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
