/** Every career at Cobalt Ridge: progress in each, and switching between them. */
import { useEffect, useState } from 'react'
import { CAREERS } from '../../content/careers'
import { departmentFor } from '../../content/departments'
import { careerLevel } from '../../game/career'
import { listProfiles } from '../../persistence/profiles'
import type { Profile } from '../../persistence/schemas'

export function CareersSection({
  profile,
  onSwitchCareer,
}: {
  profile: Profile
  onSwitchCareer: (careerId: string) => Promise<void>
}) {
  const [saves, setSaves] = useState<Profile[] | null>(null)
  const [switching, setSwitching] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void listProfiles().then((all) => {
      if (active) setSaves(all)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-6"
      data-testid="careers"
    >
      <h2 className="font-semibold text-slate-900">Careers at Cobalt Ridge</h2>
      <p className="mt-1 text-sm text-slate-600">
        Each career is a separate job in its own department, with its own manager, tasks,
        progress and files. Switching keeps everything you have done.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {CAREERS.map((career) => {
          const save = saves?.find((s) => s.careerId === career.id)
          const current = career.id === profile.careerId
          const level = save ? careerLevel(save).current.title : null
          const department = departmentFor(career.id)
          return (
            <li
              key={career.id}
              className={`rounded-lg border p-3 ${
                current ? 'border-blue-400 bg-blue-50' : 'border-slate-200'
              }`}
              data-testid={`career-${career.id}`}
            >
              <p className="font-medium text-slate-900">{career.name}</p>
              <p className="text-xs text-slate-500">
                {department.name} · manager {department.manager.name}
              </p>
              <p className="mt-1 text-sm text-slate-600">{career.description}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-600">
                  {current
                    ? `You: ${level}, ${save?.xp ?? profile.xp} XP`
                    : save
                      ? `${level}, ${save.xp} XP`
                      : `Starts as ${career.levels[0].title}`}
                </span>
                {current ? (
                  <span className="text-xs font-medium text-blue-800">
                    Current career
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={switching !== null}
                    onClick={async () => {
                      setSwitching(career.id)
                      setError(null)
                      try {
                        await onSwitchCareer(career.id)
                      } catch (e) {
                        setError(e instanceof Error ? e.message : String(e))
                        setSwitching(null)
                      }
                    }}
                    className="rounded-md bg-blue-700 px-3 py-1 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {switching === career.id
                      ? 'Switching…'
                      : save
                        ? 'Switch to this career'
                        : 'Start this career'}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  )
}
