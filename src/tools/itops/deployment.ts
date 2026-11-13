/**
 * Computer Deployment: building a computer on the bench, two ways.
 *
 * - **Server Imaging:** bench and cable the unit, catch the one-time boot
 *   menu, boot from the network, sign in to the deployment share with the
 *   service account, pick the corporate task sequence, name the machine to
 *   the convention, let it run, and prove the domain join.
 * - **Manual Domain Enrollment:** the same bench work, then the Windows
 *   setup by hand: region and keyboard, getting past the online-account
 *   screen, a local administrator, privacy settings, joining the domain in
 *   System Properties, proving the join, and the baseline apps from the
 *   company's software portal (not a web search).
 *
 * Everything the player needs is in the SOP (shown first, and on demand).
 * Wrong answers are refused with the reason and counted; hints are optional
 * and counted. A build depends on the real systems: an imaging build needs
 * the deployment server answering, a domain join needs a domain controller.
 * A finished unit goes onto the PC Shelf.
 */
import { assetByTag, logged, serviceUp } from './model'
import type { Asset, Build, DeploymentRun, ItopsState } from './schema'

export interface DeployResult {
  /** Always applied: a refused answer is counted as a mistake. */
  state: ItopsState
  problems: string[]
  note?: string
}

export const SOP = {
  id: 'IT-SOP-014',
  version: '3.2',
  owner: 'Service Desk',
  reviewed: '2026-09-30',
  nextReview: '2027-03-31',
  serviceAccount: 'CORP\\svc-osd',
  servicePassword: 'Image-Cobalt-2611',
  buildCheckUser: 'CORP\\buildcheck',
  buildCheckPassword: 'Ridge!Welcome9',
  joinAccount: 'CORP\\svc-join',
  joinPassword: 'Join-Cobalt-2611',
  domain: 'corp.cobaltridge.example',
  localAdmin: 'cr-localadmin',
  region: 'United States',
  keyboard: 'US',
  baseline: ['Office Suite', 'Endpoint Protection', 'VPN Client', 'PDF Reader'],
}

export const BUILD_NAMES: Record<Build, string> = {
  imaging: 'Server Imaging',
  manual: 'Manual Domain Enrollment',
}

/** Which build each department gets (the SOP's table). */
export const BUILD_FOR_DEPARTMENT: Array<{ who: string; build: Build; why: string }> = [
  {
    who: 'Finance, Customer Support, Sales, Marketing, Operations, Data & Insights, Executive',
    build: 'imaging',
    why: 'The corporate image: every standard app, policy and support tool, the same on every machine.',
  },
  {
    who: 'Warehouse (shift supervisors and kiosks), Reception shared PCs',
    build: 'manual',
    why: 'A minimal, locked-down hand build for shared or shop-floor machines: no corporate image.',
  },
]

export const TASK_SEQUENCES = [
  { id: 'std-w11', name: 'Cobalt Standard Workstation – Windows 11 Enterprise 24H2' },
  { id: 'kiosk', name: 'Cobalt Kiosk Lockdown (for reference only)' },
  { id: 'w10-retired', name: 'Windows 10 Standard – RETIRED, do not use' },
  { id: 'capture', name: 'Capture reference image (lab use)' },
]

export const PORTAL_APPS = [
  { name: 'Office Suite', source: 'portal' },
  { name: 'Endpoint Protection', source: 'portal' },
  { name: 'VPN Client', source: 'portal' },
  { name: 'PDF Reader', source: 'portal' },
  { name: 'DataViz Studio', source: 'portal' },
  { name: 'DesignPro', source: 'portal' },
  { name: 'PDF Reader Pro – free download (sponsored result)', source: 'web' },
  { name: 'DriverBoost Optimizer (sponsored result)', source: 'web' },
  { name: 'Office Suite free crack (web result)', source: 'web' },
] as const

export const PRIVACY_TOGGLES = [
  { id: 'location', label: 'Let apps use my location' },
  { id: 'diagnostics', label: 'Send optional diagnostic data' },
  { id: 'tailored', label: 'Tailored experiences from diagnostic data' },
  { id: 'ads', label: 'Let apps use the advertising ID' },
  { id: 'find', label: 'Find my device' },
] as const

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export type StepId =
  | 'sop'
  | 'device'
  | 'cabling'
  | 'boot'
  | 'credentials'
  | 'sequence'
  | 'name'
  | 'install'
  | 'region'
  | 'account'
  | 'admin'
  | 'privacy'
  | 'join'
  | 'signin'
  | 'apps'
  | 'done'

export const STEPS: Record<Build, StepId[]> = {
  imaging: [
    'sop',
    'device',
    'cabling',
    'boot',
    'credentials',
    'sequence',
    'name',
    'install',
    'signin',
    'done',
  ],
  manual: [
    'sop',
    'device',
    'cabling',
    'boot',
    'region',
    'account',
    'admin',
    'privacy',
    'join',
    'signin',
    'apps',
    'done',
  ],
}

export const STEP_INFO: Record<StepId, { title: string; hint: string }> = {
  sop: {
    title: 'Read the build SOP',
    hint: 'Keep the SOP open in another tab or reopen it from the SOP button: passwords and the naming rule are in it.',
  },
  device: {
    title: 'Choose the workstation',
    hint: 'A new unit from stock, or a returned unit that needs re-imaging. Desktops and laptops cable up differently.',
  },
  cabling: {
    title: 'Physical setup',
    hint: 'Every cable to the port its plug fits. The network lead goes to the DATA socket, not VOICE. On a laptop the dock carries power, network, display and USB.',
  },
  boot: {
    title: 'Power on and boot',
    hint: 'Server Imaging: press F12 during the logo screen (Send keys works too) and choose the network boot on IPv4. Manual: let it boot from its own disk into setup.',
  },
  credentials: {
    title: 'Connect to the deployment share',
    hint: 'The account is fixed; the password is the deployment service account’s, from the SOP.',
  },
  sequence: {
    title: 'Choose the task sequence',
    hint: 'The current corporate standard. Never a retired or lab sequence.',
  },
  name: {
    title: 'Name the computer',
    hint: 'CR- then D (desktop), L (laptop) or K (kiosk), then the number on the asset label, e.g. CR-L1103.',
  },
  install: { title: 'Run the build', hint: 'Leave it alone until the restarts stop.' },
  region: { title: 'Region and keyboard', hint: 'The company standard from the SOP.' },
  account: {
    title: 'Get past the online-account screen',
    hint: 'Shift+F10 opens a Command Prompt during setup. The command is start ms-cxh:localonly.',
  },
  admin: {
    title: 'Create the local administrator',
    hint: 'The name from the SOP; a unique password of at least 14 characters with upper and lower case, a number and a symbol (LAPS rotates it after the join).',
  },
  privacy: {
    title: 'Privacy settings',
    hint: 'The SOP: every optional privacy setting off.',
  },
  join: {
    title: 'Rename and join the domain',
    hint: 'System Properties: the name to the convention, Member of: Domain, the domain from the SOP, then the delegated join account.',
  },
  signin: {
    title: 'Prove the domain join',
    hint: 'Sign in with the build-check domain account from the SOP, not a local account.',
  },
  apps: {
    title: 'Install the baseline apps',
    hint: 'Only from the company software portal, and exactly the baseline in the SOP. Web search results are sponsored mirrors.',
  },
  done: {
    title: 'Shelve the unit',
    hint: 'Put it on the PC Shelf. Register it in Asset Management before it is checked out.',
  },
}

export function currentStep(run: DeploymentRun): StepId {
  const steps = STEPS[run.method]
  return steps[Math.min(run.step, steps.length - 1)]
}

export function progressOf(run: DeploymentRun): number {
  return Math.round((run.step / (STEPS[run.method].length - 1)) * 100)
}

// ---------------------------------------------------------------------------
// Cabling
// ---------------------------------------------------------------------------

export type Plug = 'iec' | 'rj45' | 'dp' | 'hdmi' | 'usba' | 'usbc' | 'barrel' | 'audio'

export interface Port {
  id: string
  label: string
  plug: Plug
  group: 'computer' | 'dock' | 'monitor' | 'wall'
}

export interface Cable {
  id: string
  label: string
  plug: Plug
  /** Ports it may go to (any port of its plug, if absent). */
  goes?: string[]
  required: boolean
}

export const PLUG_NAMES: Record<Plug, string> = {
  iec: 'mains power (IEC)',
  rj45: 'network (RJ45)',
  dp: 'DisplayPort',
  hdmi: 'HDMI',
  usba: 'USB-A',
  usbc: 'USB-C',
  barrel: 'barrel power',
  audio: '3.5 mm audio',
}

const usb = (group: Port['group'], n: number, prefix: string): Port[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-usb${i + 1}`,
    label: `USB-A ${i + 1}`,
    plug: 'usba' as const,
    group,
  }))

const MONITOR: Port[] = [
  { id: 'mon-power', label: 'Power in', plug: 'iec', group: 'monitor' },
  { id: 'mon-dp', label: 'DisplayPort in', plug: 'dp', group: 'monitor' },
  { id: 'mon-hdmi', label: 'HDMI in', plug: 'hdmi', group: 'monitor' },
]
const WALL: Port[] = [
  { id: 'wall-data', label: 'DATA 2-14', plug: 'rj45', group: 'wall' },
  { id: 'wall-voice', label: 'VOICE 2-15', plug: 'rj45', group: 'wall' },
]
const PERIPHERALS: Cable[] = [
  { id: 'keyboard', label: 'USB keyboard', plug: 'usba', required: true },
  { id: 'mouse', label: 'USB mouse', plug: 'usba', required: true },
  { id: 'headset', label: 'USB headset', plug: 'usba', required: true },
]

export function cablingLayout(device: 'desktop' | 'laptop'): {
  ports: Port[]
  cables: Cable[]
} {
  if (device === 'desktop')
    return {
      ports: [
        { id: 'pc-power', label: 'Power in', plug: 'iec', group: 'computer' },
        { id: 'pc-lan', label: 'Ethernet', plug: 'rj45', group: 'computer' },
        { id: 'pc-dp', label: 'DisplayPort', plug: 'dp', group: 'computer' },
        { id: 'pc-hdmi', label: 'HDMI', plug: 'hdmi', group: 'computer' },
        ...usb('computer', 4, 'pc'),
        { id: 'pc-usbc', label: 'USB-C', plug: 'usbc', group: 'computer' },
        { id: 'pc-audio', label: 'Audio', plug: 'audio', group: 'computer' },
        { id: 'pc-fusb1', label: 'Front USB-A 1', plug: 'usba', group: 'computer' },
        { id: 'pc-fusb2', label: 'Front USB-A 2', plug: 'usba', group: 'computer' },
        ...MONITOR,
        ...WALL,
      ],
      cables: [
        {
          id: 'power-pc',
          label: 'Power cord (computer)',
          plug: 'iec',
          goes: ['pc-power'],
          required: true,
        },
        {
          id: 'power-mon',
          label: 'Power cord (monitor)',
          plug: 'iec',
          goes: ['mon-power'],
          required: true,
        },
        {
          id: 'eth-device',
          label: 'Network lead: computer end',
          plug: 'rj45',
          goes: ['pc-lan'],
          required: true,
        },
        {
          id: 'eth-wall',
          label: 'Network lead: wall end',
          plug: 'rj45',
          goes: ['wall-data'],
          required: true,
        },
        {
          id: 'dp-device',
          label: 'DisplayPort cable: computer end',
          plug: 'dp',
          goes: ['pc-dp'],
          required: true,
        },
        {
          id: 'dp-mon',
          label: 'DisplayPort cable: monitor end',
          plug: 'dp',
          goes: ['mon-dp'],
          required: true,
        },
        ...PERIPHERALS,
      ],
    }
  return {
    ports: [
      {
        id: 'lap-usbc1',
        label: 'USB-C 1 (power + display)',
        plug: 'usbc',
        group: 'computer',
      },
      { id: 'lap-usbc2', label: 'USB-C 2', plug: 'usbc', group: 'computer' },
      { id: 'lap-hdmi', label: 'HDMI', plug: 'hdmi', group: 'computer' },
      { id: 'lap-usb1', label: 'USB-A', plug: 'usba', group: 'computer' },
      { id: 'lap-audio', label: 'Audio', plug: 'audio', group: 'computer' },
      { id: 'dock-power', label: 'Power in', plug: 'barrel', group: 'dock' },
      { id: 'dock-lan', label: 'Ethernet', plug: 'rj45', group: 'dock' },
      { id: 'dock-dp1', label: 'DisplayPort 1', plug: 'dp', group: 'dock' },
      { id: 'dock-dp2', label: 'DisplayPort 2', plug: 'dp', group: 'dock' },
      ...usb('dock', 3, 'dock'),
      ...MONITOR,
      ...WALL,
    ],
    cables: [
      {
        id: 'dock-psu',
        label: 'Dock power adapter',
        plug: 'barrel',
        goes: ['dock-power'],
        required: true,
      },
      {
        id: 'dock-cable',
        label: 'Dock cable (USB-C): laptop end',
        plug: 'usbc',
        goes: ['lap-usbc1', 'lap-usbc2'],
        required: true,
      },
      {
        id: 'power-mon',
        label: 'Power cord (monitor)',
        plug: 'iec',
        goes: ['mon-power'],
        required: true,
      },
      {
        id: 'eth-device',
        label: 'Network lead: dock end',
        plug: 'rj45',
        goes: ['dock-lan'],
        required: true,
      },
      {
        id: 'eth-wall',
        label: 'Network lead: wall end',
        plug: 'rj45',
        goes: ['wall-data'],
        required: true,
      },
      {
        id: 'dp-device',
        label: 'DisplayPort cable: dock end',
        plug: 'dp',
        goes: ['dock-dp1', 'dock-dp2'],
        required: true,
      },
      {
        id: 'dp-mon',
        label: 'DisplayPort cable: monitor end',
        plug: 'dp',
        goes: ['mon-dp'],
        required: true,
      },
      {
        id: 'charger',
        label: 'Laptop charger (USB-C, optional with a dock)',
        plug: 'usbc',
        goes: ['lap-usbc1', 'lap-usbc2'],
        required: false,
      },
      ...PERIPHERALS,
    ],
  }
}

/** What is still wrong with the cabling (empty when it is right). */
export function cablingProblems(run: DeploymentRun): string[] {
  if (!run.device) return ['Choose the workstation first.']
  const { cables } = cablingLayout(run.device)
  const out: string[] = []
  for (const cable of cables) {
    const port = run.cables[cable.id]
    if (!port) {
      if (cable.required) out.push(`${cable.label} is not connected.`)
      continue
    }
    if (cable.goes && !cable.goes.includes(port)) {
      out.push(
        port === 'wall-voice'
          ? 'The network lead is in the VOICE socket: that is patched to the phone system, so there is no network link.'
          : `${cable.label} is in the wrong port.`,
      )
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function withRun(
  state: ItopsState,
  change: (run: DeploymentRun) => DeploymentRun,
): ItopsState {
  return state.run ? { ...state, run: change(state.run) } : state
}

const mistake = (state: ItopsState, ...problems: string[]): DeployResult => ({
  state: withRun(state, (r) => ({ ...r, mistakes: r.mistakes + 1 })),
  problems,
})
/** A problem that is not the player's mistake (e.g. a server is down). */
const blocked = (state: ItopsState, ...problems: string[]): DeployResult => ({
  state,
  problems,
})

export function startRun(state: ItopsState, method: Build, hints: boolean): DeployResult {
  if (state.run)
    return blocked(
      state,
      'A build is already in progress: continue it or discard it first.',
    )
  return {
    state: logged(
      {
        ...state,
        run: {
          method,
          step: 0,
          device: null,
          unit: null,
          reimage: false,
          cables: {},
          data: {},
          hints,
          hintsUsed: 0,
          mistakes: 0,
        },
      },
      'Start build',
      BUILD_NAMES[method],
      hints ? 'Hints on.' : 'Hints off: working from the SOP.',
    ),
    problems: [],
  }
}

export function discardRun(state: ItopsState): DeployResult {
  if (!state.run) return blocked(state, 'There is no build in progress.')
  return {
    state: logged(
      { ...state, run: null },
      'Discard build',
      BUILD_NAMES[state.run.method],
    ),
    problems: [],
  }
}

export function takeHint(state: ItopsState): DeployResult {
  if (!state.run?.hints) return blocked(state, 'Hints are off for this build.')
  return {
    state: withRun(state, (r) => ({ ...r, hintsUsed: r.hintsUsed + 1 })),
    problems: [],
    note: STEP_INFO[currentStep(state.run)].hint,
  }
}

export function connectCable(
  state: ItopsState,
  cableId: string,
  portId: string,
): DeployResult {
  const run = state.run
  if (!run?.device) return blocked(state, 'Choose the workstation first.')
  const { ports, cables } = cablingLayout(run.device)
  const cable = cables.find((c) => c.id === cableId)
  const port = ports.find((p) => p.id === portId)
  if (!cable || !port) return blocked(state, 'Choose a cable, then a port.')
  if (cable.plug !== port.plug)
    return mistake(
      state,
      `A ${PLUG_NAMES[cable.plug]} plug does not fit the ${PLUG_NAMES[port.plug]} port (${port.label}).`,
    )
  const holder = Object.entries(run.cables).find(
    ([c, p]) => p === portId && c !== cableId,
  )
  if (holder)
    return blocked(state, `${port.label} already has a cable in it: unplug that first.`)
  return {
    state: withRun(state, (r) => ({ ...r, cables: { ...r.cables, [cableId]: portId } })),
    problems: [],
  }
}

export function disconnectCable(state: ItopsState, cableId: string): DeployResult {
  if (!state.run?.cables[cableId]) return blocked(state, 'That cable is not connected.')
  return {
    state: withRun(state, (r) => {
      const cables = { ...r.cables }
      delete cables[cableId]
      return { ...r, cables }
    }),
    problems: [],
  }
}

/** Units returned to the shelf that need re-imaging before they go out again. */
export const reimageCandidates = (state: ItopsState) =>
  state.assets.filter((a) => a.onShelf && a.status === 'needs-image')

const LETTER: Record<string, string> = { desktop: 'D', laptop: 'L', kiosk: 'K' }

/** The name the convention gives the unit being built. */
export function hostnameFor(state: ItopsState, run: DeploymentRun): string {
  const number = (run.unit ?? '').replace(/^A-/, '')
  const asset = run.unit ? assetByTag(state, run.unit) : undefined
  const type = asset?.type ?? run.device ?? 'desktop'
  return `CR-${LETTER[type] ?? 'D'}${number}`
}

const same = (a: string | undefined, b: string) =>
  (a ?? '').trim().toLowerCase() === b.trim().toLowerCase()

function domainUp(state: ItopsState) {
  return (
    serviceUp(state, 'DC01', 'Directory Services') ||
    serviceUp(state, 'DC02', 'Directory Services')
  )
}

const strongPassword = (p: string) =>
  p.length >= 14 &&
  /[a-z]/.test(p) &&
  /[A-Z]/.test(p) &&
  /\d/.test(p) &&
  /[^A-Za-z0-9]/.test(p)

function next(
  state: ItopsState,
  data: Record<string, string> = {},
  note?: string,
): DeployResult {
  return {
    state: withRun(state, (r) => ({
      ...r,
      step: r.step + 1,
      data: { ...r.data, ...data },
    })),
    problems: [],
    note,
  }
}

/**
 * Answers the current step. Wrong answers are refused with the reason (and
 * counted as a mistake); a fault in the company's systems blocks the step
 * without counting against the player.
 */
export function advance(state: ItopsState, input: Record<string, string>): DeployResult {
  const run = state.run
  if (!run) return blocked(state, 'Start a build first.')
  const step = currentStep(run)
  switch (step) {
    case 'sop':
      return next(state)
    case 'device': {
      if (input.unit) {
        const unit = reimageCandidates(state).find((a) => a.tag === input.unit)
        if (!unit) return blocked(state, 'That unit is not waiting to be re-imaged.')
        const device = unit.type === 'laptop' ? 'laptop' : 'desktop'
        return {
          state: withRun(state, (r) => ({
            ...r,
            device,
            unit: unit.tag,
            reimage: true,
            step: r.step + 1,
          })),
          problems: [],
        }
      }
      if (input.device !== 'desktop' && input.device !== 'laptop')
        return blocked(state, 'Choose a desktop or a laptop.')
      const device = input.device
      return {
        state: withRun(state, (r) => ({
          ...r,
          device,
          unit: `A-${state.nextAsset}`,
          reimage: false,
          step: r.step + 1,
        })),
        problems: [],
      }
    }
    case 'cabling': {
      const problems = cablingProblems(run)
      return problems.length ? mistake(state, ...problems) : next(state)
    }
    case 'boot': {
      if (run.method === 'manual') {
        if (input.key === 'F12' && input.entry?.startsWith('pxe'))
          return mistake(
            state,
            'A hand build does not use the deployment server: let it boot from its own disk into Windows setup.',
          )
        return next(state, {}, 'Windows setup has started.')
      }
      if (input.key !== 'F12')
        return mistake(
          state,
          'It went straight past the logo to “No bootable device”: the new disk is empty. Restart and press F12 while the logo shows.',
        )
      if (input.entry === 'disk' || input.entry === 'usb')
        return mistake(
          state,
          input.entry === 'disk'
            ? 'The disk is empty: “No operating system found”. The build comes from the network.'
            : 'There is no USB stick in this build.',
        )
      if (input.entry === 'pxe6')
        return mistake(
          state,
          'PXE over IPv6: “PXE-E18: Server response timeout”. This site answers network boots on IPv4.',
        )
      if (input.entry !== 'pxe4') return blocked(state, 'Choose a boot device.')
      if (!serviceUp(state, 'DEPLOY01', 'PXE Responder'))
        return blocked(
          state,
          'PXE-E16: No valid offer received. Nothing on the network answered the boot request: is the deployment server (DEPLOY01) and its PXE Responder up? Check the Server Room.',
        )
      return next(state, {}, 'Booting from the deployment server…')
    }
    case 'credentials':
      if (!same(input.password, SOP.servicePassword))
        return mistake(
          state,
          'Access denied to \\\\DEPLOY01\\DeploymentShare$: the password is wrong. It is the deployment service account’s, in the SOP.',
        )
      if (!serviceUp(state, 'DEPLOY01', 'Image Store'))
        return blocked(
          state,
          'Connected, but the image store on DEPLOY01 is not responding. Check the Server Room.',
        )
      return next(state)
    case 'sequence':
      if (input.sequence === 'std-w11') return next(state, { sequence: 'std-w11' })
      return mistake(
        state,
        input.sequence === 'w10-retired'
          ? 'That sequence is retired: it would build an unsupported Windows 10 machine.'
          : input.sequence === 'kiosk'
            ? 'The kiosk lockdown is not built by imaging: shared machines are hand-built (Manual Domain Enrollment).'
            : 'That is a lab sequence for capturing images, not for building a user’s computer.',
      )
    case 'name': {
      const expected = hostnameFor(state, run)
      if (!same(input.name, expected))
        return mistake(
          state,
          `“${input.name ?? ''}” does not follow the naming convention for this unit (asset label ${run.unit}).`,
        )
      return next(state, { name: expected })
    }
    case 'install':
      return next(
        state,
        {},
        'Build complete: Windows installed, apps and policies applied, joined to the domain.',
      )
    case 'region':
      if (!same(input.region, SOP.region) || !same(input.keyboard, SOP.keyboard))
        return mistake(
          state,
          'That is not the company standard region and keyboard (see the SOP).',
        )
      return next(state)
    case 'account': {
      const command = (input.command ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
      if (command === 'start ms-cxh:localonly')
        return next(state, {}, 'The local account screen opened.')
      if (command.includes('bypassnro'))
        return mistake(
          state,
          '“OOBE\\BYPASSNRO” has been removed from current Windows builds: it does nothing now.',
        )
      return mistake(
        state,
        `'${input.command ?? ''}' did not open the local-account screen.`,
      )
    }
    case 'admin':
      if (!same(input.user, SOP.localAdmin))
        return mistake(
          state,
          `The SOP names the local administrator account: it is not “${input.user ?? ''}”.`,
        )
      if (!strongPassword(input.password ?? ''))
        return mistake(
          state,
          'The password does not meet the policy: at least 14 characters, with upper and lower case, a number and a symbol.',
        )
      return next(state, { admin: SOP.localAdmin })
    case 'privacy': {
      const on = PRIVACY_TOGGLES.filter((t) => input[t.id] !== 'off')
      if (on.length)
        return mistake(
          state,
          `The SOP turns every optional privacy setting off: ${on.map((t) => t.label.toLowerCase()).join(', ')} still on.`,
        )
      return next(state)
    }
    case 'join': {
      const expected = hostnameFor(state, run)
      if (!same(input.name, expected))
        return mistake(
          state,
          `“${input.name ?? ''}” does not follow the naming convention for this unit (asset label ${run.unit}).`,
        )
      if (input.member !== 'domain')
        return mistake(
          state,
          'Member of: Workgroup leaves it outside the company directory. Choose Domain.',
        )
      if (!same(input.domain, SOP.domain) && !same(input.domain, 'corp'))
        return mistake(
          state,
          `The domain “${input.domain ?? ''}” could not be found. The SOP names it.`,
        )
      if (!same(input.joinUser, SOP.joinAccount) && !same(input.joinUser, 'svc-join'))
        return mistake(
          state,
          'That account cannot join computers to the domain. The SOP names the delegated join account.',
        )
      if (!same(input.joinPassword, SOP.joinPassword))
        return mistake(
          state,
          'The user name or password for the join account is incorrect.',
        )
      if (!domainUp(state))
        return blocked(
          state,
          'An Active Directory domain controller for the domain could not be contacted. Check DC01 and DC02 in the Server Room.',
        )
      return next(
        state,
        { name: expected },
        'Welcome to the corp domain. Restart to apply.',
      )
    }
    case 'signin': {
      const user = (input.user ?? '').trim().toLowerCase()
      if (user.startsWith('.\\') || user === 'administrator' || user === SOP.localAdmin)
        return mistake(
          state,
          'That is a local account: signing in with it does not prove the domain join.',
        )
      if (!(
        same(user, SOP.buildCheckUser) ||
        same(user, 'buildcheck@corp.cobaltridge.example')
      ))
        return mistake(state, 'Use the build-check domain account from the SOP.')
      if (!same(input.password, SOP.buildCheckPassword))
        return mistake(state, 'The password is incorrect.')
      if (!domainUp(state))
        return blocked(
          state,
          'There are currently no logon servers available: no domain controller answered. Check the Server Room.',
        )
      return next(state, {}, 'Signed in as CORP\\buildcheck: the domain join works.')
    }
    case 'apps': {
      const chosen = (input.apps ?? '').split('|').filter(Boolean)
      const web = chosen.filter(
        (a) => PORTAL_APPS.find((p) => p.name === a)?.source === 'web',
      )
      if (web.length)
        return mistake(
          state,
          `Never install from web search results: ${web.join(', ')} would put junkware on a machine that already holds a directory identity.`,
        )
      const missing = SOP.baseline.filter((a) => !chosen.includes(a))
      const extra = chosen.filter((a) => !SOP.baseline.includes(a))
      if (missing.length || extra.length)
        return mistake(
          state,
          [
            missing.length ? `Missing from the baseline: ${missing.join(', ')}.` : '',
            extra.length
              ? `Not part of the baseline (requested separately with a licence): ${extra.join(', ')}.`
              : '',
          ]
            .filter(Boolean)
            .join(' '),
        )
      return next(state, { apps: chosen.join('|') })
    }
    case 'done':
      return shelve(state)
  }
}

/** The finished unit goes onto the PC Shelf. */
export function shelve(state: ItopsState): DeployResult {
  const run = state.run
  if (!run || currentStep(run) !== 'done' || !run.unit || !run.device)
    return blocked(state, 'The build is not finished.')
  const name = hostnameFor(state, run)
  const today = '2026-11-13'
  const existing = run.reimage ? assetByTag(state, run.unit) : undefined
  const unit: Asset = existing
    ? {
        ...existing,
        hostname: name,
        build: run.method,
        status: 'ready',
        onShelf: true,
        assignedTo: null,
        notes: 'Re-imaged and back in stock.',
      }
    : {
        tag: run.unit,
        type: run.device,
        model: run.device === 'laptop' ? 'Vantage 14 G5' : 'Vantage Tower 7',
        hostname: name,
        assignedTo: null,
        site: null,
        status: 'needs-registration',
        build: run.method,
        onShelf: true,
        purchased: today,
        warrantyEnd: '2029-11-13',
        notes: '',
        hwFault: null,
      }
  const assets = existing
    ? state.assets.map((a) => (a.tag === unit.tag ? unit : a))
    : [...state.assets, unit]
  return {
    state: logged(
      {
        ...state,
        assets,
        run: null,
        nextAsset: existing ? state.nextAsset : state.nextAsset + 1,
      },
      'Build complete',
      unit.tag,
      `${name}, ${BUILD_NAMES[run.method]}${run.reimage ? ' (re-imaged)' : ''}; ${run.mistakes} mistake${run.mistakes === 1 ? '' : 's'}, ${run.hintsUsed} hint${run.hintsUsed === 1 ? '' : 's'}.`,
    ),
    problems: [],
    note: `${name} is on the PC Shelf${existing ? '' : '. Register it in Asset Management before it is checked out'}.`,
  }
}
