/**
 * State-aware next actions for the hands-on simulations and the Help Desk:
 * worked out from the real state each time, so the hint is always the next
 * thing still to do (the screw still in, the part still out, the ticket not
 * yet assigned), never a repeat of the opening instructions. They say what to
 * do and where the answer is (the SOP, the tests), without giving away the
 * answers the counted hints are for. Pure.
 */
import { evaluateTicket, isMonitored } from '../game/incidents'
import { arrivedTickets } from '../game/sla'
import type { TicketsContent } from '../persistence/schemas'
import { currentStep } from '../tools/itops/deployment'
import { assetByTag, nodeState, personById } from '../tools/itops/model'
import { COMPONENT_NAMES, jobFor, SCREWS } from '../tools/itops/repair'
import type { DeploymentRun, ItopsState, Node } from '../tools/itops/schema'
import type { AppHint } from './appHints'

/** Computer Deployment, for every step but the cabling (the bench says that one). */
export function deploymentHint(run: DeploymentRun | null): AppHint | null {
  if (!run)
    return {
      text: 'Choose how to build it: Server Imaging or Manual Domain Enrollment',
      detail:
        'The build SOP says which build each department gets. Hints are counted; the SOP is free.',
    }
  const step = currentStep(run)
  const unit = run.unit ? ` (asset label ${run.unit})` : ''
  const hints: Record<string, AppHint | null> = {
    sop: {
      text: 'Read the build SOP, then start the build',
      detail:
        'It has the accounts, the naming rule and the steps; you can reopen it from the SOP button.',
    },
    device: {
      text: 'Choose the workstation: a new desktop or laptop, or a returned unit to re-image',
    },
    cabling: null,
    boot:
      run.method === 'imaging'
        ? {
            text: 'Power it on and catch the one-time boot menu',
            detail:
              'The logo screen shows which key opens it; Send keys works too. Then boot from the network as the SOP says.',
            keys: ['F12'],
          }
        : { text: 'Power it on and let it boot from its own disk into Windows setup' },
    credentials: {
      text: 'Connect to the deployment share',
      detail: 'The account is fixed; its password is in the SOP.',
    },
    sequence: {
      text: 'Choose the current corporate task sequence',
      detail: 'Never a retired or lab sequence.',
    },
    name: {
      text: `Name the computer by the convention${unit}`,
      detail: 'The naming rule is in the SOP.',
    },
    install: { text: 'Let the build run, then continue when the restarts stop' },
    region: {
      text: 'Choose the company standard region and keyboard',
      detail: 'They are in the SOP.',
    },
    account: {
      text: 'Get past the online-account screen without signing in',
      detail: 'The build stays offline: the SOP says how.',
    },
    admin: {
      text: 'Create the local administrator',
      detail: 'The name is in the SOP; the password must meet the policy.',
    },
    privacy: { text: 'Set the privacy options the SOP asks for' },
    join: {
      text: 'Rename the computer and join it to the domain',
      detail:
        'System Properties: the name, the domain and the join account are in the SOP.',
    },
    signin: {
      text: 'Prove the domain join by signing in with a domain account',
      detail: 'The build-check account is in the SOP; a local account proves nothing.',
    },
    apps: {
      text: 'Install the baseline apps from the Company Portal',
      detail: 'The baseline is in the SOP. Web search results are sponsored mirrors.',
    },
    done: {
      text: 'Put the finished unit on the PC Shelf',
      detail: 'Then register it in Asset Management before it goes to anyone.',
    },
  }
  return hints[step] ?? null
}

/** The Repair Bench: the next thing still to do on this laptop. */
export function repairHint(state: ItopsState, tag: string | null): AppHint | null {
  if (!tag) return { text: 'Book a laptop in to put it on the bench' }
  const job = jobFor(state, tag)
  const asset = assetByTag(state, tag)
  if (!job || !asset) return null
  const tested = job.results.length > 0
  const faultFixed = !asset.hwFault
  const screwsIn = SCREWS - job.screwsOut.length
  if (!tested)
    return {
      text: 'Run the power-on test first',
      detail:
        'The symptoms point to the part; the built-in diagnostics name most faults.',
    }
  if (!faultFixed && !job.coverOff) {
    if (screwsIn > 0)
      return {
        text: `Undo the base screws (${screwsIn} still in)`,
        detail: 'Click each screw; they go into the screw tray.',
      }
    return { text: 'Lift the bottom cover' }
  }
  if (!faultFixed && job.batteryConnected)
    return {
      text: 'Disconnect the battery before you touch anything inside',
      detail: 'Click the battery connector on the board.',
    }
  if (!faultFixed && job.removed.length === 0)
    return {
      text: 'Take out the part the tests point to',
      detail: 'Click it to inspect it, then Remove.',
    }
  if (job.removed.length > 0)
    return {
      text: `Fit a replacement ${COMPONENT_NAMES[job.removed[0]].toLowerCase()} from the parts bin`,
      detail: 'Only the exact part for this model fits.',
    }
  if (!job.batteryConnected) return { text: 'Reconnect the battery' }
  if (job.coverOff) return { text: 'Refit the bottom cover' }
  if (screwsIn < SCREWS)
    return { text: `Refit the base screws (${SCREWS - screwsIn} still out)` }
  if (!job.verified) return { text: 'Prove the repair: run the power-on test' }
  const holder = asset.assignedTo ? personById(state, asset.assignedTo)?.name : null
  return holder
    ? {
        text: `Fixed and proven: take it back to ${holder.split(' ')[0]}’s desk`,
        detail:
          'Step back to the office (Esc), walk to their desk and press E to hand it over.',
        keys: ['Esc', 'E'],
      }
    : { text: 'Fixed and proven: mark the repair complete' }
}

/** The comms cabinet: find the hung device, then power-cycle only that one. */
export function cabinetHint(
  devices: Node[],
  state: ItopsState,
  inspected: string | null,
  off: string[],
  booting: string[],
): AppHint {
  if (booting.length) return { text: 'Wait while it starts up: watch its lights' }
  if (off.length)
    return {
      text: `Switch outlet ${devices.findIndex((d) => d.id === off[0]) + 1} back on`,
      detail: 'The device has no power until you do.',
    }
  const hung = devices.find((d) => nodeState(state, d) === 'down')
  if (!hung)
    return {
      text: 'Everything in the cabinet is running: step back to the office',
      keys: ['Esc'],
    }
  if (inspected !== hung.id)
    return {
      text: 'Find the device that has stopped: read the lights',
      detail:
        'Click a device to inspect it. A hung switch shows an amber system light and dark ports.',
    }
  return {
    text: `Switch ${hung.id}’s outlet off, then on again`,
    detail:
      'Its outlet on the power strip has its label. Cycling a working device cuts its people off.',
  }
}

/** The Help Desk queue: the most important ticket, and what it still needs. */
export function queueHint(content: TicketsContent, officeNow?: number): AppHint | null {
  const tickets = (
    officeNow === undefined ? content.tickets : arrivedTickets(content, officeNow)
  ).filter((t) => t.status !== 'resolved' && t.status !== 'closed')
  if (tickets.length === 0)
    return {
      text: 'Every ticket is handled: review your replies, then submit the task',
      detail: 'Submit is in the task pane.',
    }
  const order = (p: string | null) => (p ? Number(p.slice(1)) : 5)
  const ticket = [...tickets].sort((a, b) => order(a.priority) - order(b.priority))[0]
  if (isMonitored(ticket)) {
    if (ticket.assignee !== 'you')
      return {
        text: `Open ${ticket.id} (${ticket.from}) and assign it to yourself`,
        detail: 'Read what is wrong first; the Overview shows what is most urgent.',
      }
    const failing = evaluateTicket(ticket, content.environment).failing[0]
    if (failing)
      return {
        text: `${ticket.id}: ${failing.label}`,
        detail: `${failing.state} Fix it in the systems; the ticket resolves when it really is fixed.`,
      }
  }
  if (!ticket.priority || !ticket.category)
    return {
      text: `Set ${ticket.id}’s priority and category`,
      detail: 'Impact and urgency decide the priority: the matrix on the ticket helps.',
    }
  if (!ticket.reply.trim())
    return {
      text: `Reply to ${ticket.from} on ${ticket.id}`,
      detail: 'Plain words: what was wrong and what you did, or what happens next.',
    }
  return { text: `Choose the right status for ${ticket.id}` }
}
