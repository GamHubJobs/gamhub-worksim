/**
 * Helpers for tasks' model answers: complete builds with the right answers,
 * done through the same actions the player uses (so a model answer can never
 * do something the player cannot).
 */
import {
  advance,
  cablingLayout,
  connectCable,
  hostnameFor,
  SOP,
  startRun,
  type DeployResult,
} from './deployment'
import type { Result } from './model'
import type { Build, ItopsState } from './schema'

/** Applies an action that must succeed (a model answer that fails is a bug). */
export function must(r: Result | DeployResult): ItopsState {
  if (r.problems.length) throw new Error(r.problems.join(' '))
  return r.state
}

/** A whole build of a new unit, with no mistakes; it ends on the PC Shelf. */
export function completeBuild(
  start: ItopsState,
  method: Build,
  device: 'desktop' | 'laptop',
): ItopsState {
  let s = must(startRun(start, method, false))
  s = must(advance(s, {}))
  s = must(advance(s, { device }))
  const layout = cablingLayout(device)
  for (const cable of layout.cables.filter((c) => c.required)) {
    const used = new Set(Object.values(s.run!.cables))
    const port = layout.ports.find(
      (p) =>
        p.plug === cable.plug &&
        (!cable.goes || cable.goes.includes(p.id)) &&
        !used.has(p.id),
    )!
    s = must(connectCable(s, cable.id, port.id))
  }
  s = must(advance(s, {}))
  if (method === 'imaging') {
    s = must(advance(s, { key: 'F12', entry: 'pxe4' }))
    s = must(advance(s, { password: SOP.servicePassword }))
    s = must(advance(s, { sequence: 'std-w11' }))
    s = must(advance(s, { name: hostnameFor(s, s.run!) }))
    s = must(advance(s, {}))
    s = must(advance(s, { user: SOP.buildCheckUser, password: SOP.buildCheckPassword }))
  } else {
    s = must(advance(s, { key: 'none' }))
    s = must(advance(s, { region: SOP.region, keyboard: SOP.keyboard }))
    s = must(advance(s, { command: 'start ms-cxh:localonly' }))
    s = must(advance(s, { user: SOP.localAdmin, password: 'Bench-Temp-Pass-2611!' }))
    s = must(
      advance(s, {
        location: 'off',
        diagnostics: 'off',
        tailored: 'off',
        ads: 'off',
        find: 'off',
      }),
    )
    s = must(
      advance(s, {
        name: hostnameFor(s, s.run!),
        member: 'domain',
        domain: SOP.domain,
        joinUser: SOP.joinAccount,
        joinPassword: SOP.joinPassword,
      }),
    )
    s = must(advance(s, { user: SOP.buildCheckUser, password: SOP.buildCheckPassword }))
    s = must(advance(s, { apps: SOP.baseline.join('|') }))
  }
  return must(advance(s, {}))
}
