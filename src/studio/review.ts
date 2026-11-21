/**
 * Colleagues review a design from their own professional angle. Every comment
 * is worked out from the player's actual file (its rooms, sizes, doors,
 * furniture, finishes and costs), never picked from a fixed script:
 *
 * - the Architecture Lead: structure, layout and circulation;
 * - the Interior Designer: furniture, finishes, light and how the space is used;
 * - the Project Manager: budget, the brief and what is left to do;
 * - the Client: what it will be like to use, in their own words.
 */
import { analyse, HABITABLE, type RoomInfo, type StudioAnalysis } from './analysis'
import { catalogEntry } from './catalog'
import { itemSize } from './geometry'
import { material } from './materials'
import type { StudioState } from './model'

export type ReviewerRole = 'lead' | 'interior' | 'pm' | 'client'

export interface Review {
  role: ReviewerRole
  /** The reviewer's job title, for when no colleague's name is known. */
  title: string
  verdict: 'approved' | 'changes'
  /** What works (specific). */
  praise: string[]
  /** What to change (specific). */
  changes: string[]
}

export const REVIEWER_TITLES: Record<ReviewerRole, string> = {
  lead: 'Architecture Lead',
  interior: 'Interior Designer',
  pm: 'Project Manager',
  client: 'Client Representative',
}

const m2 = (n: number) => `${n.toFixed(1)} m²`
const list = (xs: string[]) =>
  xs.length <= 1
    ? (xs[0] ?? '')
    : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
const money = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`
const WET = ['bathroom', 'wc', 'utility', 'kitchen']
const itemsIn = (state: StudioState, r: RoomInfo) =>
  r.items.map((id) => state.items.find((i) => i.id === id)!).filter(Boolean)
const kinds = (state: StudioState, r: RoomInfo) =>
  new Set(itemsIn(state, r).map((i) => i.kind))

function lead(state: StudioState, a: StudioAnalysis): Review {
  const praise: string[] = []
  const changes: string[] = []
  const issue = (code: string) => a.issues.filter((i) => i.code === code)
  for (const i of [
    ...issue('no-entrance'),
    ...issue('unreachable'),
    ...issue('stair-landing'),
    ...issue('opening-misfit'),
  ])
    changes.push(i.message)
  const narrow = issue('narrow-room')
  for (const i of narrow) changes.push(i.message)
  const thin = state.walls.filter((w) => w.type === 'exterior' && w.thickness < 250)
  if (thin.length)
    changes.push(
      `${thin.length} outside wall${thin.length === 1 ? ' is' : 's are'} under 250 mm thick (${Math.min(...thin.map((w) => w.thickness))} mm): too thin for an insulated external wall.`,
    )
  const halls = a.rooms.filter((r) => r.use === 'hall')
  const hallArea = halls.reduce((s, r) => s + r.area, 0)
  if (a.totalArea > 0 && a.rooms.length >= 4) {
    const share = hallArea / a.totalArea
    if (share > 0.2)
      changes.push(
        `Halls and landings take ${Math.round(share * 100)}% of the floor area (${m2(hallArea)}); try to give some of that back to the rooms.`,
      )
    else if (halls.length && share <= 0.15)
      praise.push(
        `Circulation is efficient: halls take only ${Math.round(share * 100)}% of the ${m2(a.totalArea)}.`,
      )
  }
  const open = issue('open-edge')
  if (open.length && open.length === a.rooms.length && a.rooms.length > 1)
    changes.push(
      'No room is fully enclosed by walls; check the plan is closed where it should be.',
    )
  if (a.rooms.length && changes.length === 0) {
    const ways = a.rooms.filter((r) => r.connects.length >= 2).map((r) => r.name)
    praise.push(
      `Every room can be reached${a.entrance ? ' from the entrance' : ''}${ways.length ? `, and ${list(ways.slice(0, 3))} connect${ways.length === 1 ? 's' : ''} the plan well` : ''}.`,
    )
  }
  if (state.floors.length > 1 && !issue('stair-landing').length && state.stairs.length)
    praise.push(
      `The stair lands properly on the ${state.floors.find((f) => f.id === state.stairs[0].to)?.name ?? 'floor above'}.`,
    )
  if (a.rooms.length === 0)
    changes.push('There is no plan to review yet: draw the rooms first.')
  return {
    role: 'lead',
    title: REVIEWER_TITLES.lead,
    verdict: changes.length ? 'changes' : 'approved',
    praise,
    changes,
  }
}

function interior(state: StudioState, a: StudioAnalysis): Review {
  const praise: string[] = []
  const changes: string[] = []
  for (const i of a.issues.filter((x) =>
    ['item-in-wall', 'items-overlap', 'door-blocked'].includes(x.code),
  ))
    changes.push(i.message)
  for (const r of a.rooms) {
    const room = state.rooms.find((x) => x.id === r.id)!
    const items = itemsIn(state, r)
    const k = kinds(state, r)
    if (HABITABLE.includes(r.use) && items.length === 0)
      changes.push(`${r.name} is empty: furnish it so the client can picture it.`)
    // How much of the floor the furniture covers.
    const footprint = items
      .filter((i) => !catalogEntry(i.kind)?.walkable && i.elevation < 300)
      .reduce((s, i) => {
        const size = itemSize(i)
        return s + (size.width * size.depth) / 1_000_000
      }, 0)
    if (r.area > 0 && footprint / r.area > 0.45)
      changes.push(
        `${r.name} is crowded: furniture covers ${Math.round((footprint / r.area) * 100)}% of its ${m2(r.area)}. Leave at least 600 mm to walk round things.`,
      )
    const floorMat = material(room.floorFinish)
    if (WET.includes(r.use) && floorMat && ['wood', 'textile'].includes(floorMat.group))
      changes.push(
        `${floorMat.name} in the ${r.name.toLowerCase()} will not stand up to water; use tiles, stone or concrete.`,
      )
    if (
      r.use === 'bedroom' &&
      items.length &&
      ![...k].some((x) => /wardrobe|chest|cupboard/.test(x ?? ''))
    )
      changes.push(
        `${r.name} has nowhere to store clothes: add a wardrobe or chest of drawers.`,
      )
    if (r.use === 'living' && items.length && r.seats < 3)
      changes.push(
        `${r.name} seats ${r.seats}; a living room needs seating for at least three.`,
      )
    if (r.use === 'office' || r.use === 'open-plan') {
      if (r.workstations > 0 && r.area / r.workstations < 5)
        changes.push(
          `${r.name} has ${r.workstations} workstations in ${m2(r.area)}: under 5 m² each is too tight.`,
        )
    }
    if (
      r.use === 'kitchen' ||
      (r.use === 'living' && [...k].some((x) => /hob|sink/.test(x ?? '')))
    ) {
      const need = [['hob-unit'], ['sink-unit'], ['fridge']]
      const missing = need
        .filter((g) => !g.some((x) => k.has(x)))
        .map((g) => catalogEntry(g[0])!.name.toLowerCase())
      if (missing.length)
        changes.push(`The kitchen in ${r.name} has no ${list(missing)}.`)
      else praise.push(`The kitchen in ${r.name} has the hob, sink and fridge it needs.`)
    }
    if (
      floorMat &&
      HABITABLE.includes(r.use) &&
      items.length &&
      floorMat.group === 'wood'
    )
      praise.push(`${floorMat.name} works well in the ${r.name.toLowerCase()}.`)
  }
  // The palette on the walls.
  const paints = new Set(
    state.walls
      .flatMap((w) => [w.finishLeft, w.finishRight])
      .filter((id) => material(id)?.group === 'paint'),
  )
  if (paints.size > 4)
    changes.push(
      `There are ${paints.size} wall colours: pick two or three and use them consistently.`,
    )
  else if (paints.size >= 2)
    praise.push(`A restrained palette of ${paints.size} wall colours.`)
  const dark = a.issues
    .filter((i) => i.code === 'no-light')
    .map((i) => i.message.replace(' has no light fitting.', ''))
  if (dark.length)
    changes.push(`${list(dark)} ${dark.length === 1 ? 'has' : 'have'} no light fitting.`)
  if (a.rooms.length === 0) changes.push('There are no rooms to furnish yet.')
  return {
    role: 'interior',
    title: REVIEWER_TITLES.interior,
    verdict: changes.length ? 'changes' : 'approved',
    praise: praise.slice(0, 4),
    changes,
  }
}

function pm(
  state: StudioState,
  a: StudioAnalysis,
  brief: Array<{ title: string; met: boolean }>,
): Review {
  const praise: string[] = []
  const changes: string[] = []
  const budget = state.project.budget
  if (budget !== undefined) {
    if (a.costs.total > budget) {
      const top = [...state.items]
        .map((i) => ({
          name: catalogEntry(i.kind)?.name ?? i.kind,
          price: catalogEntry(i.kind)?.price ?? 0,
        }))
        .sort((x, y) => y.price - x.price)
        .slice(0, 3)
      changes.push(
        `We are ${money(a.costs.total - budget)} over the ${money(budget)} budget (${money(a.costs.total)}). The biggest items are ${list(top.map((t) => `${t.name} (${money(t.price)})`))}.`,
      )
    } else
      praise.push(
        `${money(a.costs.total)} against a ${money(budget)} budget: ${money(budget - a.costs.total)} in hand.`,
      )
  } else if (a.costs.total > 0)
    praise.push(
      `The estimate stands at ${money(a.costs.total)} (finishes ${money(a.costs.finishes)}, furniture and fittings ${money(a.costs.furniture + a.costs.fixtures)}).`,
    )
  const unmet = brief.filter((b) => !b.met)
  for (const b of unmet)
    changes.push(
      `From the brief, still to do: ${b.title.charAt(0).toLowerCase()}${b.title.slice(1)}.`,
    )
  if (brief.length && !unmet.length)
    praise.push(
      `Everything in the brief is covered (${brief.length} requirement${brief.length === 1 ? '' : 's'}).`,
    )
  const words = state.project.notes.trim().split(/\s+/).filter(Boolean).length
  if (words < 25)
    changes.push(
      'Write a short design statement (Project tab) so the client knows what we did and why.',
    )
  return {
    role: 'pm',
    title: REVIEWER_TITLES.pm,
    verdict: changes.length ? 'changes' : 'approved',
    praise,
    changes,
  }
}

function client(state: StudioState, a: StudioAnalysis): Review {
  const praise: string[] = []
  const changes: string[] = []
  const darkRooms = a.issues
    .filter((i) => i.code === 'no-window')
    .map((i) => i.message.replace(' has no window.', ''))
  if (darkRooms.length)
    changes.push(`I'd like daylight in ${list(darkRooms)}: can we have a window?`)
  const bedrooms = a.rooms.filter((r) => r.use === 'bedroom')
  for (const b of bedrooms)
    if (
      a.issues.some((i) => i.code === 'small-room' && i.refs.some((r) => r.id === b.id))
    )
      changes.push(`${b.name} feels small (${m2(b.area)}). Could it be bigger?`)
  const sunny = a.rooms
    .filter((r) => HABITABLE.includes(r.use) && r.glazing >= r.area * 0.15)
    .map((r) => r.name)
  if (sunny.length) praise.push(`I love how bright ${list(sunny.slice(0, 2))} will be.`)
  const biggest = [...a.rooms].sort((x, y) => y.area - x.area)[0]
  if (biggest && biggest.items.length)
    praise.push(`${biggest.name} looks like a lovely space.`)
  const budget = state.project.budget
  if (budget !== undefined && a.costs.total > budget)
    changes.push(`I can't go over ${money(budget)}, I'm afraid.`)
  if (a.rooms.length === 0) changes.push('I can’t see a plan yet!')
  return {
    role: 'client',
    title: REVIEWER_TITLES.client,
    verdict: changes.length ? 'changes' : 'approved',
    praise,
    changes,
  }
}

/** Every colleague's review of the design (with the brief's requirements, when it is a task). */
export function reviewDesign(
  state: StudioState,
  brief: Array<{ title: string; met: boolean }> = [],
): Review[] {
  const a = analyse(state)
  return [lead(state, a), interior(state, a), pm(state, a, brief), client(state, a)]
}

/** The reviews as plain text for an email, with the reviewers' names. */
export function reviewText(
  reviews: Review[],
  name: (role: ReviewerRole) => string,
): string {
  return reviews
    .map((r) => {
      const lines = [
        `${name(r.role)} (${r.title}): ${r.verdict === 'approved' ? 'approved' : 'changes needed'}.`,
      ]
      for (const p of r.praise.slice(0, 2)) lines.push(`  + ${p}`)
      for (const c of r.changes.slice(0, 4)) lines.push(`  – ${c}`)
      return lines.join('\n')
    })
    .join('\n\n')
}
