/**
 * Computer Deployment: the method menu (with a paused build), and the build
 * itself, screen by screen: the SOP, choosing the workstation, cabling it on
 * the bench, the boot, and the setup screens of the chosen method. The
 * answers are checked by deployment.ts; this only draws the screens.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '../../ui/Icon'
import { BUTTON, CARD, GoThere, INPUT, Pill, PRIMARY, type SectionProps } from './kit'
import { Bench } from './bench/Bench'
import { useAppHint } from '../../guide/appHints'
import { deploymentHint } from '../../guide/stepHints'
import {
  advance,
  BUILD_FOR_DEPARTMENT,
  BUILD_NAMES,
  connectCable,
  currentStep,
  disconnectCable,
  discardRun,
  hostnameFor,
  PORTAL_APPS,
  PRIVACY_TOGGLES,
  progressOf,
  reimageCandidates,
  SOP,
  startRun,
  STEP_INFO,
  STEPS,
  takeHint,
  TASK_SEQUENCES,
} from './deployment'
import type { Build, DeploymentRun } from './schema'

export function SopDocument() {
  return (
    <article className="space-y-3 text-sm text-slate-800" data-testid="sop">
      <header className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <p className="text-sm font-semibold text-slate-900">
          Workstation build procedure
        </p>
        <p>
          Document {SOP.id} · version {SOP.version} · owner: {SOP.owner} · internal: do
          not share outside IT · reviewed {SOP.reviewed} · next review {SOP.nextReview}
        </p>
      </header>
      <section>
        <h4 className="font-semibold text-slate-900">1. Which build</h4>
        <table className="mt-1 w-full text-left text-xs">
          <tbody className="divide-y divide-slate-100">
            {BUILD_FOR_DEPARTMENT.map((b) => (
              <tr key={b.build}>
                <td className="py-1 pr-2 align-top">{b.who}</td>
                <td className="py-1 pr-2 align-top font-medium whitespace-nowrap">
                  {BUILD_NAMES[b.build]}
                </td>
                <td className="py-1 align-top text-slate-600">{b.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h4 className="font-semibold text-slate-900">2. Bench setup (both builds)</h4>
        <p>
          Power to the computer (or the dock for a laptop) and the monitor; the network
          lead from the machine to the wall socket marked DATA (never VOICE); the monitor
          by DisplayPort; keyboard, mouse and headset by USB.
        </p>
      </section>
      <section>
        <h4 className="font-semibold text-slate-900">3. Naming convention</h4>
        <p>
          <code>CR-</code> + <code>D</code> desktop / <code>L</code> laptop /{' '}
          <code>K</code> kiosk + the number on the asset label. Asset A-1104 on a laptop
          is <code>CR-L1104</code>.
        </p>
      </section>
      <section>
        <h4 className="font-semibold text-slate-900">4. Server Imaging</h4>
        <ol className="list-decimal space-y-0.5 pl-5">
          <li>
            Power on and press F12 at the logo for the one-time boot menu; boot from the
            network (PXE) on IPv4.
          </li>
          <li>
            Deployment share account: <code>{SOP.serviceAccount}</code>, password{' '}
            <code>{SOP.servicePassword}</code>.
          </li>
          <li>Task sequence: the current corporate standard workstation.</li>
          <li>
            Computer name (OSDComputerName): by the convention, before the run starts.
          </li>
          <li>
            Leave the build alone until the restarts stop, then prove the join (step 6).
          </li>
        </ol>
      </section>
      <section>
        <h4 className="font-semibold text-slate-900">5. Manual Domain Enrollment</h4>
        <ol className="list-decimal space-y-0.5 pl-5">
          <li>
            Boot from the disk into Windows setup. Region <b>{SOP.region}</b>, keyboard{' '}
            <b>{SOP.keyboard}</b>.
          </li>
          <li>
            The build stays offline: at the online-account screen press Shift+F10 and run{' '}
            <code>start ms-cxh:localonly</code>.
          </li>
          <li>
            Local administrator <code>{SOP.localAdmin}</code> with a unique temporary
            password (14+ characters, upper and lower case, number, symbol). LAPS rotates
            it after the join; never reuse one password across machines.
          </li>
          <li>Privacy: every optional setting off.</li>
          <li>
            System Properties → Computer Name → Change: name by the convention, Member of{' '}
            <b>Domain</b> <code>{SOP.domain}</code>; join account{' '}
            <code>{SOP.joinAccount}</code>, password <code>{SOP.joinPassword}</code>.
            Restart.
          </li>
          <li>
            Baseline apps from the Company Portal only: {SOP.baseline.join(', ')}.
            Anything else needs its own request and licence.
          </li>
        </ol>
      </section>
      <section>
        <h4 className="font-semibold text-slate-900">6. Prove the domain join</h4>
        <p>
          Sign in once as <code>{SOP.buildCheckUser}</code> with first-login password{' '}
          <code>{SOP.buildCheckPassword}</code>. A local account proves nothing.
        </p>
      </section>
      <section>
        <h4 className="font-semibold text-slate-900">7. After the build</h4>
        <p>
          Shelve the unit, then register it in Asset Management (New asset) before
          checking it out or shipping it.
        </p>
      </section>
      <p className="text-xs text-slate-500">
        On a real service desk these passwords live in a password vault and the runbook
        points to it. Everything here is fictional.
      </p>
    </article>
  )
}

const SEND_KEYS = ['F12', 'F2', 'Shift+F10', 'Ctrl+Alt+Del', 'Esc'] as const

/** What the bench monitor shows behind the window: firmware, setup, a wizard, sign-in. */
const SCREEN_BACKGROUNDS: Record<string, string> = {
  'Bench monitor': 'bg-black font-mono',
  'Task sequence progress': 'bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900',
  'Deployment wizard': 'bg-gradient-to-br from-slate-800 via-slate-900 to-teal-950',
  'Windows setup': 'bg-gradient-to-br from-indigo-950 via-blue-900 to-sky-800',
  'System Properties': 'bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-800',
  'Windows sign-in': 'bg-gradient-to-br from-blue-950 via-indigo-900 to-sky-900',
}

/** The bench monitor: a bezel, a power light and a stand around what the machine shows. */
function Screen({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="rounded-2xl bg-slate-900 p-3 shadow-xl ring-1 ring-slate-700">
        <div
          className={`relative flex aspect-[16/9] max-h-[62vh] w-full flex-col justify-center overflow-hidden rounded-md p-6 text-sm text-slate-100 ${SCREEN_BACKGROUNDS[label] ?? 'bg-slate-950'}`}
          role="region"
          aria-label={label}
          data-testid="bench-screen"
        >
          {children}
        </div>
        <div className="mt-2 flex items-center justify-between px-2 text-[10px] tracking-widest text-slate-500">
          <span>CLEARVIEW 27</span>
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"
            aria-hidden
          />
        </div>
      </div>
      <div
        className="mx-auto h-6 w-24 bg-gradient-to-b from-slate-700 to-slate-800"
        aria-hidden
      />
      <div className="mx-auto h-2 w-56 rounded-full bg-slate-800" aria-hidden />
    </div>
  )
}

function Dialog({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-lg rounded-md border border-slate-300 bg-white font-sans text-slate-900 shadow-lg">
      <p className="rounded-t-md bg-slate-100 px-3 py-1.5 text-sm font-medium">{title}</p>
      <div className="space-y-3 p-4 text-sm">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      {label}
      {children}
    </label>
  )
}

// ---------------------------------------------------------------------------
// Cabling
// ---------------------------------------------------------------------------

function Cabling({ run, ...p }: SectionProps & { run: DeploymentRun }) {
  return (
    <div className="space-y-3">
      <Bench
        run={run}
        editable={p.editable}
        onConnect={(cable, port) =>
          p.deploy((s) => connectCable(s, cable, port)).problems
        }
        onDisconnect={(cable) => p.deploy((s) => disconnectCable(s, cable))}
      />
      <button
        type="button"
        className={PRIMARY}
        disabled={!p.editable}
        onClick={() => p.deploy((s) => advance(s, {}))}
      >
        Check the connections and continue
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function Boot({ run, ...p }: SectionProps & { run: DeploymentRun }) {
  const [phase, setPhase] = useState<'off' | 'post' | 'menu' | 'bios'>('off')
  const [left, setLeft] = useState(5)
  const pressed = useRef(false)
  const deploy = useRef(p.deploy)
  useEffect(() => {
    deploy.current = p.deploy
  })

  useEffect(() => {
    if (phase !== 'post') return
    if (left <= 0) {
      if (!pressed.current) {
        setPhase('off')
        deploy.current((s) => advance(s, { key: 'none' }))
      }
      return
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, left])

  const send = (key: string) => {
    if (phase !== 'post') return
    if (key === 'F12') {
      pressed.current = true
      setPhase('menu')
    } else if (key === 'F2') {
      pressed.current = true
      setPhase('bios')
    }
  }
  useEffect(() => {
    if (phase !== 'post') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F12' || e.key === 'F2') {
        e.preventDefault()
        send(e.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="space-y-3">
      <SendKeys onSend={send} disabled={phase !== 'post'} />
      <Screen label="Bench monitor">
        {phase === 'off' ? (
          <div className="text-center font-sans">
            <p className="mb-3 text-slate-400">The unit is cabled and powered off.</p>
            <button
              type="button"
              className={PRIMARY}
              disabled={!p.editable}
              onClick={() => {
                pressed.current = false
                setLeft(5)
                setPhase('post')
              }}
            >
              Power on
            </button>
          </div>
        ) : phase === 'post' ? (
          <div className="text-center" data-testid="post-screen">
            <p className="text-2xl font-bold tracking-widest">VANTAGE</p>
            <p className="mt-6 text-slate-300">
              F2 Setup &nbsp;·&nbsp; F12 One-time boot menu
            </p>
            <p className="mt-2 text-xs text-slate-500">Continuing in {left}…</p>
          </div>
        ) : phase === 'bios' ? (
          <div>
            <p>Firmware setup</p>
            <p className="mt-2 text-slate-400">
              Boot order: Windows Boot Manager, UEFI network (IPv4), UEFI network (IPv6).
              Nothing to change here.
            </p>
            <button
              type="button"
              className={`${BUTTON} mt-4`}
              onClick={() => setPhase('off')}
            >
              Save and exit (power off)
            </button>
          </div>
        ) : (
          <div data-testid="boot-menu">
            <p className="mb-3">One-time boot menu</p>
            <ul className="space-y-1">
              {(
                [
                  ['disk', 'Windows Boot Manager (internal drive)'],
                  ['pxe4', 'UEFI: PXE IPv4 Onboard Ethernet'],
                  ['pxe6', 'UEFI: PXE IPv6 Onboard Ethernet'],
                  ['usb', 'UEFI: USB storage'],
                ] as const
              ).map(([id, label]) => (
                <li key={id}>
                  <button
                    type="button"
                    className="w-full rounded px-2 py-1 text-left hover:bg-blue-800"
                    onClick={() => {
                      setPhase('off')
                      p.deploy((s) => advance(s, { key: 'F12', entry: id }))
                    }}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Screen>
      {run.method === 'manual' && phase === 'off' && (
        <p className="text-xs text-slate-600">
          A hand build boots from its own disk into Windows setup.
        </p>
      )}
    </div>
  )
}

function SendKeys({
  onSend,
  disabled,
}: {
  onSend: (key: string) => void
  disabled?: boolean
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 text-xs text-slate-700"
      aria-label="Send keys to the bench machine"
      role="group"
    >
      <span>Send keys:</span>
      {SEND_KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className={BUTTON}
          disabled={disabled}
          onClick={() => onSend(k)}
        >
          {k}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// The other steps
// ---------------------------------------------------------------------------

function Install({ run, ...p }: SectionProps & { run: DeploymentRun }) {
  const phases =
    run.method === 'imaging'
      ? [
          'Formatting the disk',
          'Applying the Windows image',
          'Installing drivers',
          'Restarting',
          'Installing applications',
          'Applying policies and joining the domain',
          'Restarting',
        ]
      : []
  const [i, setI] = useState(0)
  useEffect(() => {
    if (i >= phases.length) return
    const t = setTimeout(() => setI((n) => n + 1), 700)
    return () => clearTimeout(t)
  }, [i, phases.length])
  const done = i >= phases.length
  return (
    <Screen label="Task sequence progress">
      <div className="font-sans">
        <p className="mb-2">Running: {TASK_SEQUENCES[0].name}</p>
        <div className="h-2 w-full overflow-hidden rounded bg-slate-700">
          <div
            className="h-full bg-teal-500 transition-all"
            style={{ width: `${Math.round((i / phases.length) * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-slate-300" aria-live="polite">
          {done ? 'Finished: no more restarts.' : `${phases[i]}…`}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Do not power off or unplug the machine.
        </p>
        <button
          type="button"
          className={`${PRIMARY} mt-4`}
          disabled={!done || !p.editable}
          onClick={() => p.deploy((s) => advance(s, {}))}
        >
          Continue
        </button>
      </div>
    </Screen>
  )
}

function Account(p: SectionProps) {
  const [prompt, setPrompt] = useState(false)
  const [command, setCommand] = useState('')
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F10' && e.shiftKey) {
        e.preventDefault()
        setPrompt(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="space-y-3">
      <SendKeys onSend={(k) => k === 'Shift+F10' && setPrompt(true)} />
      <Screen label="Windows setup">
        <div className="font-sans">
          <p className="text-lg">Let’s add your account</p>
          <p className="mt-1 text-slate-300">
            Sign in with your online account to continue.
          </p>
          <input
            className="mt-3 w-full rounded bg-slate-800 px-2 py-1"
            placeholder="Email or phone"
            disabled
          />
          <button
            type="button"
            className={`${BUTTON} mt-3`}
            onClick={() => setOffline(true)}
          >
            Next
          </button>
          {offline && (
            <p className="mt-2 text-amber-300">
              You need an internet connection to continue. (This build stays offline.)
            </p>
          )}
          {prompt && (
            <form
              className="mt-4 rounded border border-slate-600 bg-black p-3 font-mono"
              onSubmit={(e) => {
                e.preventDefault()
                p.deploy((s) => advance(s, { command }))
              }}
              aria-label="Command Prompt"
            >
              <p className="text-xs text-slate-400">Administrator: Command Prompt</p>
              <label className="mt-1 flex items-center gap-1">
                <span>X:\Windows\System32&gt;</span>
                <input
                  autoFocus
                  aria-label="Command"
                  className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                />
              </label>
            </form>
          )}
        </div>
      </Screen>
    </div>
  )
}

function Apps(p: SectionProps) {
  const [chosen, setChosen] = useState<string[]>([])
  const [tab, setTab] = useState<'portal' | 'web'>('portal')
  const toggle = (name: string) =>
    setChosen((c) => (c.includes(name) ? c.filter((x) => x !== name) : [...c, name]))
  return (
    <Dialog title={tab === 'portal' ? 'Company Portal' : 'Web browser – search results'}>
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          className={tab === 'portal' ? PRIMARY : BUTTON}
          onClick={() => setTab('portal')}
        >
          Company Portal
        </button>
        <button
          type="button"
          className={tab === 'web' ? PRIMARY : BUTTON}
          onClick={() => setTab('web')}
        >
          Web search
        </button>
      </div>
      <ul className="space-y-1">
        {PORTAL_APPS.filter((a) => a.source === tab).map((a) => (
          <li key={a.name}>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={chosen.includes(a.name)}
                onChange={() => toggle(a.name)}
              />
              {a.name}
              {a.source === 'web' && <Pill tone="amber">Ad</Pill>}
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={PRIMARY}
        disabled={!p.editable}
        onClick={() => p.deploy((s) => advance(s, { apps: chosen.join('|') }))}
      >
        Install selected ({chosen.length})
      </button>
    </Dialog>
  )
}

function StepView({ run, ...p }: SectionProps & { run: DeploymentRun }) {
  const step = currentStep(run)
  const [form, setForm] = useState<Record<string, string>>({})
  const set = (k: string) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = (data: Record<string, string> = form) =>
    p.deploy((s) => advance(s, data))
  const go = (label: string, data?: Record<string, string>) => (
    <button
      type="button"
      className={PRIMARY}
      disabled={!p.editable}
      onClick={() => submit(data)}
    >
      {label}
    </button>
  )
  switch (step) {
    case 'sop':
      return (
        <div className={`${CARD} space-y-3`}>
          <SopDocument />
          {go('I have read the SOP: start the build')}
        </div>
      )
    case 'device': {
      const returned = reimageCandidates(p.state)
      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {(['desktop', 'laptop'] as const).map((d) => (
              <button
                key={d}
                type="button"
                disabled={!p.editable}
                onClick={() => submit({ device: d })}
                className={`${CARD} text-left hover:border-teal-500`}
              >
                <Icon
                  name={d === 'desktop' ? 'desktop' : 'device'}
                  className="h-8 w-8 text-teal-700"
                />
                <p className="mt-2 font-semibold text-slate-900">New {d} from stock</p>
                <p className="text-sm text-slate-600">
                  {d === 'desktop'
                    ? 'Vantage Tower 7: rear ports on the tower.'
                    : 'Vantage 14 G5 on a USB-C dock.'}{' '}
                  Asset label A-{p.state.nextAsset}.
                </p>
              </button>
            ))}
          </div>
          {returned.length > 0 && (
            <section className={CARD} aria-label="Returned units">
              <h4 className="font-semibold text-slate-900">
                Returned units waiting to be re-imaged
              </h4>
              <ul className="mt-2 space-y-1 text-sm">
                {returned.map((a) => (
                  <li key={a.tag} className="flex items-center justify-between gap-2">
                    <span>
                      {a.tag} · {a.type} · {a.model}
                    </span>
                    <button
                      type="button"
                      className={BUTTON}
                      disabled={!p.editable}
                      onClick={() => submit({ unit: a.tag })}
                    >
                      Re-image this unit
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )
    }
    case 'cabling':
      return <Cabling {...p} run={run} />
    case 'boot':
      return <Boot {...p} run={run} />
    case 'credentials':
      return (
        <Screen label="Deployment wizard">
          <Dialog title="Deployment Wizard – connect to the deployment share">
            <p className="text-xs text-slate-600">\\DEPLOY01\DeploymentShare$</p>
            <Field label="User name">
              <input className={INPUT} value="svc-osd" disabled />
            </Field>
            <Field label="Domain">
              <input className={INPUT} value="CORP" disabled />
            </Field>
            <Field label="Password">
              <input
                className={INPUT}
                type="password"
                value={form.password ?? ''}
                onChange={set('password')}
              />
            </Field>
            {go('OK')}
          </Dialog>
        </Screen>
      )
    case 'sequence':
      return (
        <Screen label="Deployment wizard">
          <Dialog title="Deployment Wizard – task sequence">
            <fieldset className="space-y-1">
              <legend className="mb-1 text-slate-700">
                Select a task sequence to run on this computer
              </legend>
              {TASK_SEQUENCES.map((t) => (
                <label key={t.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="sequence"
                    checked={form.sequence === t.id}
                    onChange={() => setForm((f) => ({ ...f, sequence: t.id }))}
                  />
                  {t.name}
                </label>
              ))}
            </fieldset>
            {go('Next')}
          </Dialog>
        </Screen>
      )
    case 'name':
      return (
        <Screen label="Deployment wizard">
          <Dialog title="Deployment Wizard – computer details">
            <p className="rounded border border-slate-300 bg-amber-50 px-2 py-1 text-xs">
              Asset label on this unit: <b>{run.unit}</b> ({run.device})
            </p>
            <Field label="OSDComputerName">
              <input className={INPUT} value={form.name ?? ''} onChange={set('name')} />
            </Field>
            {go('Begin')}
          </Dialog>
        </Screen>
      )
    case 'install':
      return <Install {...p} run={run} />
    case 'region':
      return (
        <Screen label="Windows setup">
          <Dialog title="Windows setup">
            <Field label="Is this the right country or region?">
              <select
                className={INPUT}
                value={form.region ?? ''}
                onChange={set('region')}
              >
                <option value="">Choose…</option>
                {[
                  'United Kingdom',
                  'United States',
                  'Canada',
                  'Ireland',
                  'Australia',
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Is this the right keyboard layout?">
              <select
                className={INPUT}
                value={form.keyboard ?? ''}
                onChange={set('keyboard')}
              >
                <option value="">Choose…</option>
                {[
                  'US',
                  'United Kingdom',
                  'US-International',
                  'Canadian Multilingual',
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            {go('Yes')}
          </Dialog>
        </Screen>
      )
    case 'account':
      return <Account {...p} />
    case 'admin':
      return (
        <Screen label="Windows setup">
          <Dialog title="Who’s going to use this device?">
            <Field label="User name">
              <input className={INPUT} value={form.user ?? ''} onChange={set('user')} />
            </Field>
            <Field label="Password">
              <input
                className={INPUT}
                type="password"
                value={form.password ?? ''}
                onChange={set('password')}
              />
            </Field>
            {go('Next')}
          </Dialog>
        </Screen>
      )
    case 'privacy':
      return (
        <Screen label="Windows setup">
          <Dialog title="Choose privacy settings for your device">
            {PRIVACY_TOGGLES.map((t) => {
              const on = form[t.id] !== 'off'
              return (
                <label key={t.id} className="flex items-center justify-between gap-2">
                  {t.label}
                  <input
                    type="checkbox"
                    role="switch"
                    checked={on}
                    onChange={() => setForm((f) => ({ ...f, [t.id]: on ? 'off' : 'on' }))}
                  />
                </label>
              )
            })}
            {go('Accept')}
          </Dialog>
        </Screen>
      )
    case 'join':
      return (
        <Screen label="System Properties">
          <Dialog title="System Properties – Computer Name/Domain Changes">
            <p className="text-xs text-slate-600">
              Opened from the taskbar search: View advanced system settings → Computer
              Name → Change…
            </p>
            <Field label="Computer name">
              <input className={INPUT} value={form.name ?? ''} onChange={set('name')} />
            </Field>
            <fieldset className="space-y-1">
              <legend className="text-slate-700">Member of</legend>
              {(['domain', 'workgroup'] as const).map((m) => (
                <label key={m} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="member"
                    checked={form.member === m}
                    onChange={() => setForm((f) => ({ ...f, member: m }))}
                  />
                  {m === 'domain' ? 'Domain' : 'Workgroup'}
                </label>
              ))}
              <input
                className={INPUT}
                aria-label="Domain or workgroup name"
                value={form.domain ?? ''}
                onChange={set('domain')}
              />
            </fieldset>
            <p className="pt-1 font-medium">
              Enter the name and password of an account with permission to join the domain
            </p>
            <Field label="User name">
              <input
                className={INPUT}
                value={form.joinUser ?? ''}
                onChange={set('joinUser')}
              />
            </Field>
            <Field label="Password">
              <input
                className={INPUT}
                type="password"
                value={form.joinPassword ?? ''}
                onChange={set('joinPassword')}
              />
            </Field>
            {go('OK')}
          </Dialog>
        </Screen>
      )
    case 'signin':
      return (
        <Screen label="Windows sign-in">
          <Dialog title="Other user">
            <p className="text-xs text-slate-600">Sign in to: CORP</p>
            <Field label="User name">
              <input className={INPUT} value={form.user ?? ''} onChange={set('user')} />
            </Field>
            <Field label="Password">
              <input
                className={INPUT}
                type="password"
                value={form.password ?? ''}
                onChange={set('password')}
              />
            </Field>
            {go('Sign in')}
          </Dialog>
        </Screen>
      )
    case 'apps':
      return <Apps {...p} />
    case 'done':
      return (
        <div className={`${CARD} space-y-2`}>
          <p className="font-semibold text-slate-900">
            Build finished: {hostnameFor(p.state, run)}
          </p>
          <p className="text-sm text-slate-700">
            {BUILD_NAMES[run.method]} · {run.mistakes} mistake
            {run.mistakes === 1 ? '' : 's'} · {run.hintsUsed} hint
            {run.hintsUsed === 1 ? '' : 's'}
          </p>
          {go('Put it on the PC Shelf')}
        </div>
      )
  }
}

function Run({ run, ...p }: SectionProps & { run: DeploymentRun }) {
  const steps = STEPS[run.method]
  const step = currentStep(run)
  const [sop, setSop] = useState(false)
  // The bench says what to plug in next; every other step, this does.
  useAppHint(p.onSite && step !== 'cabling' ? deploymentHint(run) : null)
  return (
    <div className="space-y-4" data-testid="deployment-run" data-step={step}>
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-900 px-4 py-2 text-sm text-slate-100">
        <span className="font-semibold">{BUILD_NAMES[run.method]}</span>
        <span>
          Step {Math.min(run.step + 1, steps.length)} of {steps.length}:{' '}
          {STEP_INFO[step].title}
        </span>
        <span className="h-1.5 w-32 overflow-hidden rounded bg-slate-700" aria-hidden>
          <span
            className="block h-full bg-teal-400"
            style={{ width: `${progressOf(run)}%` }}
          />
        </span>
        <span className="text-slate-300">Mistakes {run.mistakes}</span>
        <span className="ml-auto flex flex-wrap gap-1.5">
          {step !== 'sop' && (
            <button
              type="button"
              className="rounded bg-slate-700 px-2 py-0.5 hover:bg-slate-600"
              onClick={() => setSop((s) => !s)}
              aria-pressed={sop}
            >
              SOP
            </button>
          )}
          {run.hints && (
            <button
              type="button"
              className="rounded bg-amber-600 px-2 py-0.5 hover:bg-amber-500"
              disabled={!p.editable}
              onClick={() => p.deploy(takeHint)}
            >
              Hint ({run.hintsUsed})
            </button>
          )}
        </span>
      </div>
      {sop && step !== 'sop' && (
        <div className={`${CARD} max-h-96 overflow-y-auto`}>
          <SopDocument />
        </div>
      )}
      <StepView key={`${run.step}`} {...p} run={run} />
    </div>
  )
}

export default function Deployment(p: SectionProps) {
  const run = p.state.run
  const [hints, setHints] = useState(false)
  const [menu, setMenu] = useState(!run)
  const [docs, setDocs] = useState(false)
  useAppHint(p.onSite && (!run || menu) ? deploymentHint(null) : null)
  if (!p.onSite)
    return (
      <div className="space-y-4 p-4" data-testid="deployment-menu">
        <h2 className="text-xl font-semibold text-slate-900">Computer Deployment</h2>
        <GoThere where="the IT workbench, on the right-hand side of the office">
          {run && (
            <p className="mt-2">
              On the bench: <b>{BUILD_NAMES[run.method]}</b>
              {run.unit ? ` (${run.unit})` : ''}, {progressOf(run)}% done, at “
              {STEP_INFO[currentStep(run)].title}”.
            </p>
          )}
        </GoThere>
        <button type="button" className={BUTTON} onClick={() => setDocs((d) => !d)}>
          {docs ? 'Hide the build SOP' : 'Read the build SOP'}
        </button>
        {docs && (
          <div className={CARD}>
            <SopDocument />
          </div>
        )}
      </div>
    )
  if (run && !menu) {
    return (
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-slate-900">Computer Deployment</h2>
          <button type="button" className={BUTTON} onClick={() => setMenu(true)}>
            Pause and go to the menu
          </button>
        </div>
        <Run {...p} run={run} />
      </div>
    )
  }
  const start = (method: Build) => {
    const r = p.deploy((s) => startRun(s, method, hints))
    if (!r.problems.length) setMenu(false)
  }
  return (
    <div className="space-y-4 p-4" data-testid="deployment-menu">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Computer Deployment</h2>
        <p className="text-sm text-slate-600">
          Build a computer on the bench. Which build a person needs depends on their
          department:{' '}
          <button
            type="button"
            className="text-teal-800 underline"
            onClick={() => setDocs((d) => !d)}
          >
            check the build SOP
          </button>
          .
        </p>
      </header>
      {docs && (
        <div className={`${CARD} max-h-[28rem] overflow-y-auto`}>
          <SopDocument />
        </div>
      )}
      {run && (
        <section
          className={`${CARD} flex flex-wrap items-center justify-between gap-3 border-amber-300 bg-amber-50`}
          aria-label="Paused build"
        >
          <span className="text-sm text-amber-950">
            Paused: <b>{BUILD_NAMES[run.method]}</b>
            {run.unit ? ` (${run.unit})` : ''}, {progressOf(run)}% done, at “
            {STEP_INFO[currentStep(run)].title}”.
          </span>
          <span className="flex gap-2">
            <button type="button" className={PRIMARY} onClick={() => setMenu(false)}>
              Continue
            </button>
            <button
              type="button"
              className={BUTTON}
              disabled={!p.editable}
              onClick={() => p.deploy(discardRun)}
            >
              Discard
            </button>
          </span>
        </section>
      )}
      <label className="flex items-center gap-2 text-sm text-slate-800">
        <input type="checkbox" checked={hints} onChange={() => setHints((h) => !h)} />
        Hints (each hint is counted; working from the SOP with hints off is how real
        builds are done)
      </label>
      <div className="grid gap-3 md:grid-cols-3">
        {(
          [
            [
              'imaging',
              'server',
              'Network boot from the deployment server and the corporate task sequence.',
            ],
            [
              'manual',
              'settings',
              'Walk Windows setup by hand and join the domain in System Properties.',
            ],
          ] as const
        ).map(([method, icon, text]) => (
          <div key={method} className={`${CARD} flex flex-col`}>
            <Icon name={icon} className="h-8 w-8 text-teal-700" />
            <h3 className="mt-2 font-semibold text-slate-900">{BUILD_NAMES[method]}</h3>
            <p className="flex-1 text-sm text-slate-600">{text}</p>
            <button
              type="button"
              className={`${PRIMARY} mt-3`}
              disabled={!p.editable || !!run}
              onClick={() => start(method)}
            >
              Start
            </button>
          </div>
        ))}
        <div className={`${CARD} flex flex-col opacity-60`}>
          <Icon name="network" className="h-8 w-8 text-slate-500" />
          <h3 className="mt-2 font-semibold text-slate-900">Cloud provisioning</h3>
          <p className="flex-1 text-sm text-slate-600">
            Zero-touch builds shipped straight to the user.
          </p>
          <p className="mt-3 text-xs font-medium text-slate-600">
            Not available in this version
          </p>
        </div>
      </div>
      {run && (
        <p className="text-xs text-slate-600">
          Finish or discard the paused build before starting another.
        </p>
      )}
    </div>
  )
}
