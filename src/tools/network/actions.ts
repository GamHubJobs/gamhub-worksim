/** What the player can do in Network Tools. Pure: each returns a new state. */
import type { Fault, NetworkState } from './schema'
import { deviceByName, runCommand, subnetOf } from './simulation'

type Result = { state: NetworkState; problems: string[] }

const record = (state: NetworkState, action: string, target: string, detail = '') => ({
  ...state,
  actions: [...state.actions, { action, target, detail }].slice(-300),
})

/** Runs a command and keeps it, with its output, in the console history. */
export function runConsole(
  state: NetworkState,
  from: string,
  command: string,
): NetworkState {
  const output = runCommand(state, from, command).slice(0, 60)
  return {
    ...state,
    console: [
      ...state.console,
      { from, command: command.trim().slice(0, 200), output },
    ].slice(-300),
  }
}

export function clearConsole(state: NetworkState): NetworkState {
  return { ...state, console: [] }
}

/** Restarts a device remotely. Only works for devices that crashed. */
export function restartDevice(state: NetworkState, name: string): Result {
  const device = deviceByName(state, name)
  if (!device) return { state, problems: ['That device is not on the network map.'] }
  if (device.up) {
    return { state: record(state, 'Restart device', device.name), problems: [] }
  }
  if (!device.restartable) {
    return {
      state,
      problems: [
        `${device.name} does not respond to remote commands. Someone needs to check it on site (power, cable).`,
      ],
    }
  }
  return {
    state: record(
      {
        ...state,
        devices: state.devices.map((d) =>
          d.name === device.name ? { ...d, up: true } : d,
        ),
      },
      'Restart device',
      device.name,
    ),
    problems: [],
  }
}

export function restartService(state: NetworkState, name: string, port: number): Result {
  const device = deviceByName(state, name)
  const service = device?.services.find((s) => s.port === port)
  if (!device || !service) return { state, problems: ['That service does not exist.'] }
  if (!device.up) return { state, problems: [`${device.name} is not responding.`] }
  return {
    state: record(
      {
        ...state,
        devices: state.devices.map((d) =>
          d.name === device.name
            ? {
                ...d,
                services: d.services.map((s) =>
                  s.port === port ? { ...s, running: true } : s,
                ),
              }
            : d,
        ),
      },
      'Restart service',
      device.name,
      service.name,
    ),
    problems: [],
  }
}

/** Switches a computer back to automatic network settings (DHCP). */
export function switchToAutomaticSettings(state: NetworkState, name: string): Result {
  const device = deviceByName(state, name)
  if (!device?.config)
    return { state, problems: ['Only computers have network settings to change.'] }
  if (!device.up) return { state, problems: [`${device.name} is not responding.`] }
  const subnet = subnetOf(state, device)
  if (!subnet) return { state, problems: ['The device is not on an office network.'] }
  return {
    state: record(
      {
        ...state,
        devices: state.devices.map((d) =>
          d.name === device.name
            ? {
                ...d,
                config: { gateway: subnet.gateway, dns: state.dns.server, static: false },
              }
            : d,
        ),
      },
      'Use automatic settings',
      device.name,
    ),
    problems: [],
  }
}

export function setDnsRecord(state: NetworkState, name: string, ip: string): Result {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip))
    return { state, problems: ['Enter an IP address, e.g. 10.20.0.21.'] }
  const exists = state.dns.records.some((r) => r.name === name)
  if (!exists) return { state, problems: [`There is no record called ${name}.`] }
  const old = state.dns.records.find((r) => r.name === name)?.ip
  return {
    state: record(
      {
        ...state,
        dns: {
          ...state.dns,
          records: state.dns.records.map((r) => (r.name === name ? { ...r, ip } : r)),
        },
      },
      'Change DNS record',
      name,
      `${old} → ${ip}`,
    ),
    problems: [],
  }
}

export function addFinding(
  state: NetworkState,
  input: { device: string; fault: Fault; note: string },
): Result {
  if (!deviceByName(state, input.device))
    return { state, problems: ['Choose the device.'] }
  let n = state.findings.length + 1
  while (state.findings.some((f) => f.id === `f${n}`)) n++
  return {
    state: {
      ...state,
      findings: [...state.findings, { id: `f${n}`, ...input, note: input.note.trim() }],
    },
    problems: [],
  }
}

export function removeFinding(state: NetworkState, id: string): NetworkState {
  return { ...state, findings: state.findings.filter((f) => f.id !== id) }
}
