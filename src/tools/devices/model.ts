/**
 * Device actions, as remote support does them. Pure functions: each returns
 * the new state (or the problems that stop it) and logs what was done. The
 * rules are inside the actions (a remote session is needed, a system process
 * cannot be ended, an install needs space and the installer service).
 */
import type { App, Device, DevicesState } from './schema'

export type Result = { state: DevicesState; problems: string[] }

export function findDevice(state: DevicesState, name: string): Device | undefined {
  return state.devices.find((d) => d.name.toLowerCase() === name.toLowerCase())
}

// ---------------------------------------------------------------------------
// What a device shows (derived from its state)
// ---------------------------------------------------------------------------

/** Processor use now (%), from its processes. */
export function cpuOf(device: Device): number {
  return Math.min(100, Math.round(device.processes.reduce((sum, p) => sum + p.cpu, 0)))
}

/** Memory in use (GB), from its processes. */
export function memoryUsedGb(device: Device): number {
  const mb = device.processes.reduce((sum, p) => sum + p.memoryMb, 0)
  return Math.round((mb / 1024) * 10) / 10
}

export function freeGb(device: Device): number {
  return Math.round((device.storage.totalGb - device.storage.usedGb) * 10) / 10
}

export function serviceRunning(device: Device, name: string): boolean {
  return device.services.some((s) => s.name === name && s.running)
}

/** Its network settings are the company standard. */
export function standardNetwork(state: DevicesState, device: Device): boolean {
  return (
    device.network.mode === 'automatic' &&
    device.network.dns === state.standard.dns &&
    device.network.proxy === state.standard.proxy
  )
}

/** Health problems, in words (for Device Management and the tickets). */
export function issuesOf(state: DevicesState, device: Device): string[] {
  if (device.type === 'printer') return []
  const issues: string[] = []
  if (device.status === 'offline') issues.push('Offline')
  if (cpuOf(device) >= 80) issues.push(`Processor at ${cpuOf(device)}%`)
  if (freeGb(device) < device.storage.totalGb * 0.1)
    issues.push(`Only ${freeGb(device)} GB free`)
  for (const app of device.apps)
    if (app.state === 'crashing' || app.state === 'install-failed')
      issues.push(
        `${app.name}: ${app.state === 'crashing' ? 'crashing' : 'install failed'}`,
      )
  for (const s of device.services)
    if (!s.running && s.startup === 'automatic') issues.push(`${s.name} stopped`)
  if (device.updates.some((u) => u.state === 'failed')) issues.push('Update failed')
  if (device.printQueue.some((j) => j.stuck)) issues.push('Print job stuck')
  if (!standardNetwork(state, device)) issues.push('Non-standard network settings')
  if (device.restartPending) issues.push('Restart pending')
  return issues
}

// ---------------------------------------------------------------------------
// Changing devices
// ---------------------------------------------------------------------------

function log(
  state: DevicesState,
  device: string,
  action: string,
  detail = '',
): DevicesState {
  const seq = state.log.reduce((max, e) => Math.max(max, e.seq), 0) + 1
  return { ...state, log: [...state.log, { seq, device, action, detail }].slice(-2000) }
}

/**
 * Changes a device the player is connected to. Remote changes need a remote
 * session to that device (Remote Desktop), as in real remote support.
 */
function onDevice(
  state: DevicesState,
  name: string,
  action: string,
  change: (device: Device) => Device | string,
  detail = '',
): Result {
  const device = findDevice(state, name)
  if (!device) return { state, problems: ['That device is not in the inventory.'] }
  if (state.session?.device !== device.name)
    return {
      state,
      problems: [`Connect to ${device.name} with Remote Desktop first.`],
    }
  const changed = change(device)
  if (typeof changed === 'string') return { state, problems: [changed] }
  const next = {
    ...state,
    devices: state.devices.map((d) => (d.name === device.name ? changed : d)),
  }
  return { state: log(next, device.name, action, detail), problems: [] }
}

/**
 * Starts a remote session. The device must be online and reachable on the
 * network (`reachable`: from Network Tools when the queue has it).
 */
export function connect(state: DevicesState, name: string, reachable = true): Result {
  const device = findDevice(state, name)
  if (!device) return { state, problems: ['That device is not in the inventory.'] }
  if (device.type === 'printer')
    return { state, problems: [`${device.name} is a printer: it has no remote desktop.`] }
  if (device.status !== 'online' || !reachable)
    return {
      state,
      problems: [
        `${device.name} is not reachable over the network, so a remote session cannot start. Check its network connection first.`,
      ],
    }
  if (state.session?.device === device.name) return { state, problems: [] }
  const next = { ...state, session: { device: device.name } }
  return {
    state: log(
      next,
      device.name,
      'Connect',
      `Remote session with ${device.owner || device.name}`,
    ),
    problems: [],
  }
}

export function disconnect(state: DevicesState): Result {
  if (!state.session) return { state, problems: [] }
  const name = state.session.device
  return { state: log({ ...state, session: null }, name, 'Disconnect'), problems: [] }
}

/** Ends a process in Task Manager (never a system one). */
export const endProcess = (state: DevicesState, name: string, process: string) =>
  onDevice(
    state,
    name,
    'End process',
    (d) => {
      const p = d.processes.find((x) => x.name === process)
      if (!p) return `${process} is not running.`
      if (p.system)
        return `${process} is part of Windows: ending it would crash the computer and lose the user’s work.`
      return { ...d, processes: d.processes.filter((x) => x.name !== process) }
    },
    process,
  )

/** Disk Cleanup: removes temporary files (never the user's own files). */
export const diskCleanup = (state: DevicesState, name: string) =>
  onDevice(state, name, 'Disk Cleanup', (d) => {
    if (d.storage.tempGb <= 0) return 'There are no temporary files to remove.'
    return {
      ...d,
      storage: {
        ...d.storage,
        usedGb: Math.round((d.storage.usedGb - d.storage.tempGb) * 10) / 10,
        tempGb: 0,
      },
    }
  })

/** Starts or restarts a service (a disabled one is set back to automatic). */
export const restartService = (state: DevicesState, name: string, service: string) =>
  onDevice(
    state,
    name,
    'Restart service',
    (d) => {
      const s = d.services.find((x) => x.name === service)
      if (!s) return `There is no service called ${service}.`
      let next: Device = {
        ...d,
        services: d.services.map((x) =>
          x.name === service
            ? {
                ...x,
                running: true,
                startup: x.startup === 'disabled' ? 'automatic' : x.startup,
              }
            : x,
        ),
      }
      // A restarted print spooler drops the stuck jobs and prints the rest.
      if (service === 'Print Spooler') next = { ...next, printQueue: [] }
      return next
    },
    service,
  )

export const stopService = (state: DevicesState, name: string, service: string) =>
  onDevice(
    state,
    name,
    'Stop service',
    (d) => {
      const s = d.services.find((x) => x.name === service)
      if (!s) return `There is no service called ${service}.`
      if (!s.running) return `${service} is already stopped.`
      return {
        ...d,
        services: d.services.map((x) =>
          x.name === service ? { ...x, running: false } : x,
        ),
      }
    },
    service,
  )

const appOf = (d: Device, app: string): App | undefined =>
  d.apps.find((a) => a.name === app)

/** Repairs an installed app: fixes damaged files (not other faults). */
export const repairApp = (state: DevicesState, name: string, app: string) =>
  onDevice(
    state,
    name,
    'Repair app',
    (d) => {
      const a = appOf(d, app)
      if (!a || a.state === 'not-installed' || a.state === 'install-failed')
        return `${app} is not installed: install it instead.`
      return {
        ...d,
        apps: d.apps.map((x) =>
          x.name === app && x.fault === 'corrupt'
            ? { ...x, state: 'working' as const, fault: 'none' as const }
            : x,
        ),
      }
    },
    app,
  )

/** Installs (or reinstalls) an approved app from the company catalogue. */
export const installApp = (state: DevicesState, name: string, app: string) =>
  onDevice(
    state,
    name,
    'Install app',
    (d) => {
      const a = appOf(d, app)
      if (!a) return `${app} is not in the company catalogue.`
      if (!a.approved) return `${app} is not approved software: it cannot be installed.`
      if (!serviceRunning(d, 'Windows Installer'))
        return 'The install failed: the Windows Installer service is not running.'
      const extra = a.state === 'working' || a.state === 'crashing' ? 0 : a.sizeGb
      if (d.storage.totalGb - d.storage.usedGb < extra + 2)
        return `The install failed: not enough free space (${freeGb(d)} GB).`
      return {
        ...d,
        storage: {
          ...d.storage,
          usedGb: Math.round((d.storage.usedGb + extra) * 10) / 10,
        },
        apps: d.apps.map((x) =>
          x.name === app
            ? {
                ...x,
                state: 'working' as const,
                fault: 'none' as const,
                version: x.latest,
              }
            : x,
        ),
      }
    },
    app,
  )

export const uninstallApp = (state: DevicesState, name: string, app: string) =>
  onDevice(
    state,
    name,
    'Uninstall app',
    (d) => {
      const a = appOf(d, app)
      if (!a || a.state === 'not-installed') return `${app} is not installed.`
      return {
        ...d,
        storage: {
          ...d.storage,
          usedGb: Math.max(0, Math.round((d.storage.usedGb - a.sizeGb) * 10) / 10),
        },
        apps: d.apps.map((x) =>
          x.name === app
            ? { ...x, state: 'not-installed' as const, fault: 'none' as const }
            : x,
        ),
      }
    },
    app,
  )

/** Sets the network back to the company standard (automatic settings, no proxy). */
export const resetNetwork = (state: DevicesState, name: string) =>
  onDevice(state, name, 'Reset network settings', (d) => ({
    ...d,
    network: {
      ...d.network,
      mode: 'automatic',
      dns: state.standard.dns,
      proxy: state.standard.proxy,
    },
  }))

/** Retries failed and pending updates: they need space and the update service. */
export const installUpdates = (state: DevicesState, name: string) =>
  onDevice(state, name, 'Install updates', (d) => {
    const waiting = d.updates.filter((u) => u.state !== 'installed')
    if (waiting.length === 0) return 'Windows is up to date.'
    if (!serviceRunning(d, 'Windows Update'))
      return 'The updates failed again: the Windows Update service is not running.'
    if (freeGb(d) < 5) return 'The updates failed again: not enough free space.'
    return {
      ...d,
      updates: d.updates.map((u) => ({ ...u, state: 'installed' as const, error: '' })),
      restartPending: true,
    }
  })

/** Clears the print queue (the stuck jobs are cancelled). */
export const clearPrintQueue = (state: DevicesState, name: string) =>
  onDevice(state, name, 'Clear print queue', (d) => {
    if (d.printQueue.length === 0) return 'The print queue is empty.'
    if (!serviceRunning(d, 'Print Spooler'))
      return 'The queue cannot be cleared while the Print Spooler service is stopped.'
    return { ...d, printQueue: [] }
  })

/**
 * Restarts the computer: finishes installed updates, and ends the processes
 * that do not start again by themselves. The remote session ends.
 */
export function restartDevice(state: DevicesState, name: string): Result {
  const result = onDevice(state, name, 'Restart', (d) => ({
    ...d,
    restartPending: false,
    processes: d.processes.filter((p) => p.system || p.cpu < 50),
  }))
  if (result.problems.length) return result
  return { state: { ...result.state, session: null }, problems: [] }
}
