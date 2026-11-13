/** The physical setup bench's next step, from what is really plugged in. */
import type { AppHint } from '../../../guide/appHints'
import { cablingLayout, type Cable, type Port } from '../deployment'
import { spotsFor, VIEW_NAMES, type View } from './geometry'

const STATION: Record<Port['group'], string> = {
  computer: 'the computer',
  dock: 'the dock',
  monitor: 'the monitor',
  wall: 'the floor box',
}

/** "Network lead: dock end" → "the dock end of the network lead". */
function cableName(label: string): string {
  const [what, end] = label.split(': ')
  const base = what.replace(/ \(.*\)$/, '').toLowerCase()
  return end ? `the ${end.toLowerCase()} of the ${base}` : `the ${base}`
}

/**
 * The next cable to connect, from what is really plugged in (state-aware): a
 * cable in the wrong socket first, then the first one still missing.
 */
export function benchHint(
  device: 'laptop' | 'desktop',
  cables: Record<string, string>,
  holding: Cable | null,
  view: View,
): AppHint {
  const { ports, cables: all } = cablingLayout(device)
  const portName = (id: string) => {
    const p = ports.find((x) => x.id === id)
    return p ? `${p.label} on ${STATION[p.group]}` : id
  }
  const wrong = all.find((c) => cables[c.id] && c.goes && !c.goes.includes(cables[c.id]))
  if (wrong)
    return {
      text:
        cables[wrong.id] === 'wall-voice'
          ? 'Move the network lead from the VOICE socket to the DATA socket'
          : `Move ${cableName(wrong.label)} to ${portName(wrong.goes![0])}`,
      detail:
        'Drag the plug out of its port onto the right one, or click Unplug next to it in the tray.',
    }
  const missing = all.find((c) => c.required && !cables[c.id])
  const total = all.filter((c) => c.required).length
  const done = all.filter((c) => c.required && cables[c.id]).length
  if (!missing)
    return {
      text: 'Every cable is in: check the connections and continue',
      detail: 'The lights and the monitor show what is working.',
    }
  if (holding && holding.id !== missing.id)
    return {
      text: `Choose the port for ${cableName(holding.label)}`,
      detail:
        'Ports that take this plug are outlined. A plug that does not fit is refused.',
    }
  const target = missing.goes?.[0]
  const where = target
    ? portName(target)
    : device === 'laptop'
      ? 'a free USB-A port on the dock'
      : 'a free USB-A port on the computer'
  const spot = target ? spotsFor(device)[target] : undefined
  const turn =
    spot?.view && spot.view !== view
      ? ` (turn the computer: ${VIEW_NAMES[spot.view].toLowerCase()})`
      : ''
  return {
    text: `Connect ${cableName(missing.label)} to ${where}${turn}`,
    detail: `Drag it from the cable tray onto the port, or click it and then the port. ${done} of ${total} connected.`,
  }
}
