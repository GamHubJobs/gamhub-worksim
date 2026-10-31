import { getPerson } from '../content/departments'

export function Avatar({
  personId,
  size = 'md',
}: {
  personId: string
  size?: 'sm' | 'md'
}) {
  const person = getPerson(personId)
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${person.color} ${
        size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
      }`}
      aria-hidden
    >
      {person.initials}
    </span>
  )
}
