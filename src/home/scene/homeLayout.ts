/**
 * The player's home as a walkable place: what is solid (walls, furniture
 * owned, the fittings) and an activity for everything that can be done at
 * home, at the piece of furniture it needs. Worked out from the home's size,
 * its rooms and where its furniture goes, so every home (and whatever the
 * player has bought) works the same way. Coordinates match HomeScene.
 */
import { getFurniture, type Home, type SlotId } from '../../content/home'
import type { Box } from '../../world/character/controller'
import type { Activity, Stage } from '../../world/interaction/activity'

type Spot = { x: number; z: number; heading: number; y?: number }

/** Half the size of each piece on the floor (before its turn), and its height. */
const FOOTPRINT: Partial<Record<SlotId, [number, number, number]>> = {
  bed: [0.55, 1.05, 0.6],
  sofa: [0.82, 0.36, 0.7],
  tv: [0.7, 0.2, 1],
  table: [0.55, 0.8, 0.8],
  desk: [0.6, 0.35, 0.8],
  kitchen: [1.12, 0.32, 0.95],
  shower: [0.46, 0.46, 2],
  wardrobe: [0.6, 0.28, 2],
  shelf: [0.5, 0.16, 1.6],
  plant: [0.25, 0.25, 1],
  lamp: [0.15, 0.15, 1.5],
}

/** A point in front of (or on) a piece of furniture, and the way to face it. */
function at(
  place: { at: [number, number, number] },
  side: number,
  along = 0,
  face = 0,
): Spot {
  const [x, z, t] = place.at
  return {
    x: x + Math.cos(t) * along + Math.sin(t) * side,
    z: z - Math.sin(t) * along + Math.cos(t) * side,
    heading: t + face,
  }
}

/** When things happen as the courier hands over a takeaway (seconds into answering the door). */
export const DELIVERY_TIMES = { open: 1.2, greet: 2.2, take: 1.4, close: 1.6 }

export interface HomeLayout {
  boxes: Box[]
  activities: Activity[]
  start: { x: number; z: number; heading: number }
}

export function homeLayout(
  home: Home,
  furniture: Record<string, { item: string; colour: number }>,
  morning: boolean,
  /** The takeaway was left on the doorstep (picked up, rather than handed over). */
  doorstep = false,
): HomeLayout {
  const [w, d] = home.size
  const back = -d / 2
  const left = -w / 2
  const bathWall = home.rooms.bathroom[0] - 1.2
  const owned = (slot: SlotId) => {
    const entry = furniture[slot]
    return entry && getFurniture(entry.item)
      ? home.places.find((p) => p.slot === slot)
      : undefined
  }
  const box = (x: number, z: number, hx: number, hz: number, top = 1.2): Box => ({
    x,
    z,
    hx,
    hz,
    top,
  })

  // Walls, the bathroom wall, the fittings, and the furniture owned.
  const boxes: Box[] = [
    box(0, back - 0.07, w / 2, 0.1, 2.5),
    box(0, d / 2 + 0.07, w / 2, 0.1, 1.1),
    box(left - 0.07, 0, 0.1, d / 2, 2.5),
    box(w / 2 + 0.07, 0, 0.1, d / 2, 1.1),
    box(bathWall, back + d * 0.21, 0.06, d * 0.21, 2.5),
    box(left + 0.4, back + 0.4, 0.34, 0.32, 1.8),
    box(bathWall + 0.45, back + 0.4, 0.22, 0.3, 0.8),
    box(bathWall + 1.15, back + 0.25, 0.26, 0.2, 1),
  ]
  for (const place of home.places) {
    const size = FOOTPRINT[place.slot]
    if (!size || !owned(place.slot)) continue
    const turned = Math.abs(Math.sin(place.at[2])) > 0.7
    boxes.push(
      box(
        place.at[0],
        place.at[1],
        turned ? size[1] : size[0],
        turned ? size[0] : size[1],
        size[2],
      ),
    )
  }

  // Where to sit: the sofa if there is one, else the edge of the bed.
  const sofa = owned('sofa')
  const bed = owned('bed')
  const table = owned('table')
  const seat: Spot | null = sofa
    ? { ...at(sofa, 0.05), y: -0.12 }
    : bed
      ? { ...at(bed, 0, 0.62, -Math.PI / 2), y: 0.02 }
      : null
  const tableSeat: Spot | null = table ? at(table, 0.55) : seat
  const basin: Spot = { x: bathWall + 1.15, z: back + 0.78, heading: 0 }
  const door: Spot = { x: left + 0.85, z: d / 2 - 0.9, heading: Math.PI / 2 }

  const activities: Activity[] = []
  const add = (
    id: string,
    prompt: string,
    first: Spot,
    stages: Stage[],
    extra: Partial<Activity> = {},
  ) =>
    activities.push({
      id,
      action: id,
      prompt,
      spot: {
        x: first.x + Math.sin(first.heading) * 0.5,
        z: first.z + Math.cos(first.heading) * 0.5,
        reach: 1,
      },
      anchor: first,
      stages,
      ...extra,
    })
  const sitThen = (
    spot: Spot | null,
    clip: Stage['clip'],
    seconds: number,
    label: string,
    hold?: Stage['hold'],
  ): Stage[] =>
    spot
      ? [
          { clip: 'sit', seconds: 1.2, label: 'Sitting down', at: spot, hold },
          { clip, seconds, label, hold },
        ]
      : [
          {
            clip: clip === 'eat' || clip === 'drink' ? 'stand' : clip,
            seconds,
            label,
            hold,
          },
        ]

  const kitchen = owned('kitchen')
  if (kitchen) {
    const hob = at(kitchen, 0.62, -0.5)
    const pan: [number, number, number] = [
      kitchen.at[0] - 0.5 * Math.cos(kitchen.at[2]),
      1.0,
      kitchen.at[1] + 0.5 * Math.sin(kitchen.at[2]),
    ]
    add(
      'cook',
      'cook dinner',
      hob,
      [
        { clip: 'cook', seconds: 10, label: 'Cooking dinner', hold: { right: 'spoon' } },
        { clip: 'reach', seconds: 1, label: 'Serving up' },
        ...sitThen(tableSeat, 'eat', 9.6, 'Eating dinner', { right: 'fork' }),
      ],
      {
        sounds: [
          { at: 0.6, id: 'pour' },
          { at: 1.5, id: 'water', every: 2.5, until: 9 },
          { at: 13, id: 'bite', every: 3.2, until: 21 },
        ],
        effects: [
          { kind: 'sizzle', from: 0.8, to: 10, at: pan },
          { kind: 'steam', from: 1.5, to: 12, at: [pan[0], pan[1] + 0.05, pan[2]] },
        ],
        object: 'pan',
      },
    )
    add(
      'breakfast',
      'make breakfast',
      hob,
      [
        { clip: 'cook', seconds: 4, label: 'Making breakfast', hold: { right: 'spoon' } },
        ...sitThen(tableSeat, 'eat', 6.4, 'Eating breakfast', { right: 'spoon' }),
      ],
      {
        sounds: [
          { at: 0.5, id: 'pour' },
          { at: 6.5, id: 'bite', every: 3.2 },
        ],
        effects: [{ kind: 'steam', from: 0.5, to: 6, at: pan }],
      },
    )
  }
  const coffee = owned('coffee')
  if (coffee) {
    const machine = at(coffee, 0.6)
    add(
      'coffee',
      'make a proper coffee',
      machine,
      [
        { clip: 'reach', seconds: 1.2, label: 'Making a coffee' },
        { clip: 'stand', seconds: 2, label: 'The coffee pours' },
        ...sitThen(tableSeat, 'drink', 6, 'Drinking your coffee', { right: 'mug' }),
      ],
      {
        sounds: [
          { at: 1.2, id: 'pour' },
          { at: 5.5, id: 'sip', every: 4.5 },
        ],
        effects: [
          { kind: 'steam', from: 3.2, to: 11, at: [0, 0.05, -0.04], follow: 'right' },
        ],
      },
    )
  }
  // A takeaway: ordered on the phone; then a courier at the door hands it over
  // (DELIVERY_TIMES, which the courier in HomeScene keeps to); then eaten.
  add(
    'takeaway',
    'order a takeaway',
    seat ?? door,
    [
      ...(seat ? [{ clip: 'sit' as const, seconds: 1.2, label: 'Sitting down' }] : []),
      {
        clip: 'phone',
        seconds: 4,
        label: 'Choosing and ordering a takeaway',
        hold: { right: 'phone' },
      },
    ],
    {
      sounds: [
        { at: 2, id: 'beep' },
        { at: 4.6, id: 'phone' },
      ],
    },
  )
  add('takeaway-wait', 'wait for the takeaway', seat ?? door, [
    ...(seat ? [{ clip: 'sit' as const, seconds: 1.2, label: 'Sitting down' }] : []),
    {
      clip: 'phone',
      seconds: 5,
      label: 'Waiting for the takeaway',
      hold: { right: 'phone' },
    },
  ])
  add(
    'takeaway-door',
    doorstep ? 'pick up the takeaway from the doorstep' : 'answer the door',
    door,
    doorstep
      ? [
          { clip: 'push-door', seconds: DELIVERY_TIMES.open, label: 'Opening the door' },
          {
            clip: 'crouch',
            seconds: 1.4,
            label: 'Picking up the bag from the doorstep',
            hold: { right: 'bag' },
          },
          {
            clip: 'push-door',
            seconds: 1,
            label: 'Closing the door',
            hold: { right: 'bag' },
          },
        ]
      : [
          { clip: 'push-door', seconds: DELIVERY_TIMES.open, label: 'Opening the door' },
          {
            clip: 'talk',
            seconds: DELIVERY_TIMES.greet,
            label: 'Saying hello to the courier',
          },
          {
            clip: 'reach',
            seconds: DELIVERY_TIMES.take,
            label: 'Taking the bag',
            hold: { right: 'bag' },
          },
          {
            clip: 'push-door',
            seconds: DELIVERY_TIMES.close,
            label: 'Saying thanks and closing the door',
            hold: { right: 'bag' },
          },
        ],
    {
      view: 'behind',
      sounds: [
        { at: 0.3, id: 'door' },
        { at: doorstep ? 3.2 : 6.3, id: 'door' },
      ],
    },
  )
  add(
    'takeaway-eat',
    'eat the takeaway',
    tableSeat ?? door,
    [
      {
        clip: 'reach',
        seconds: 1.6,
        label: 'Unpacking the takeaway',
        hold: { right: 'bag' },
      },
      ...sitThen(tableSeat, 'eat', 8, 'Eating the takeaway', { right: 'fork' }),
    ],
    {
      sounds: [
        { at: 0.4, id: 'rustle' },
        { at: 4, id: 'bite', every: 3.2 },
      ],
    },
  )
  add('groceries', 'order a week of groceries', door, [
    {
      clip: 'phone',
      seconds: 5,
      label: 'Ordering groceries on your phone',
      hold: { right: 'phone' },
    },
  ])
  const shower = owned('shower')
  if (shower) {
    const head: [number, number, number] = [shower.at[0], 2.0, shower.at[1]]
    add(
      'shower',
      'wash and shower',
      basin,
      [
        {
          clip: 'brush-teeth',
          seconds: 4,
          label: 'Brushing your teeth',
          hold: { right: 'toothbrush' },
        },
        { clip: 'wash-hands', seconds: 3, label: 'Washing your hands and face' },
        {
          clip: 'shower',
          seconds: 11,
          label: 'Showering',
          at: at(shower, 0, 0, Math.PI),
        },
        { clip: 'dress', seconds: 2, label: 'Drying off' },
      ],
      {
        sounds: [
          { at: 0.2, id: 'water', every: 1, until: 6.8 },
          { at: 7.4, id: 'water', every: 1, until: 18 },
        ],
        effects: [
          { kind: 'tap', from: 0.2, to: 7, at: [basin.x, 1.0, basin.z - 0.5] },
          { kind: 'bubbles', from: 4, to: 7, at: [basin.x, 0.95, basin.z - 0.48] },
          { kind: 'shower', from: 7.4, to: 18.2, at: head },
          { kind: 'splash', from: 7.6, to: 18.4, at: [head[0], 0.02, head[2]] },
          { kind: 'steam', from: 9, to: 20, at: [head[0], 1.7, head[2]] },
        ],
      },
    )
  }
  const wardrobe = owned('wardrobe')
  if (wardrobe)
    add(
      'dress',
      'get dressed for work',
      at(wardrobe, 0.7),
      [{ clip: 'dress', seconds: 5, label: 'Getting dressed' }],
      { sounds: [{ at: 0.5, id: 'rustle', every: 1.2 }] },
    )
  const shelf = owned('shelf')
  if (shelf)
    add('read', 'read a book', at(shelf, 0.6), [
      { clip: 'reach', seconds: 1.2, label: 'Choosing a book', hold: { right: 'book' } },
      ...sitThen(seat, 'read', 12, 'Reading', { right: 'book' }),
    ])
  if (owned('tv'))
    add(
      'series',
      'watch a series',
      seat ?? at(owned('tv')!, 1.6),
      sitThen(seat, 'sit-relax', 12, 'Watching a series'),
      {
        object: 'tv',
      },
    )
  add(
    'call',
    'call a friend',
    seat ?? door,
    sitThen(seat, 'phone', 10, 'On the phone to a friend', { right: 'phone' }),
  )
  const desk = owned('desk')
  if (desk)
    add(
      'study',
      'study for work',
      at(desk, 0.55),
      [
        { clip: 'sit', seconds: 1, label: 'Sitting at the desk' },
        { clip: 'type', seconds: 6, label: 'Working through a course' },
        { clip: 'write', seconds: 6, label: 'Making notes', hold: { right: 'pen' } },
      ],
      { sounds: [{ at: 1.2, id: 'type', every: 0.18, until: 7 }] },
    )
  if (owned('console'))
    add(
      'games',
      'play video games',
      seat ?? at(owned('tv')!, 1.6),
      sitThen(seat, 'read', 12, 'Playing games', { left: 'phone' }),
      {
        object: 'tv',
      },
    )
  const mat = owned('mat')
  if (mat)
    add('yoga', 'stretch and do yoga', at(mat, 0), [
      { clip: 'stretch', seconds: 5, label: 'Stretching' },
      { clip: 'yoga', seconds: 8, label: 'Yoga' },
    ])
  add(
    'run',
    'go for a run',
    door,
    [
      { clip: 'stretch', seconds: 3, label: 'Warming up' },
      { clip: 'push-door', seconds: 1.2, label: 'Out for a run' },
    ],
    { sounds: [{ at: 3.2, id: 'door' }] },
  )
  add(
    'out',
    'meet friends in town',
    door,
    [{ clip: 'push-door', seconds: 1.2, label: 'Heading out' }],
    { sounds: [{ at: 0.4, id: 'door' }] },
  )
  // Bed and the front door complete the evening and the way out.
  if (bed)
    activities.push({
      id: 'bed',
      action: 'bed',
      prompt: 'go to bed',
      spot: { ...at(bed, 0, 0.75), reach: 1.2 },
      anchor: { ...at(bed, 0, 0.62, -Math.PI / 2), y: 0.02 },
      stages: [
        { clip: 'sit', seconds: 1.2, label: 'Sitting on the bed' },
        // Lie down along the bed, the head on the pillow.
        {
          clip: 'lie-down',
          seconds: 1.6,
          label: 'Lying down',
          at: { ...at(bed, 0.2, 0, Math.PI), y: 0.05 },
        },
        { clip: 'sleep', seconds: 4, label: 'Falling asleep' },
      ],
    })
  activities.push({
    id: 'go-out',
    action: 'go-out',
    prompt: 'open the front door and go out',
    spot: { x: door.x, z: door.z, reach: 1 },
    anchor: door,
    stages: [{ clip: 'push-door', seconds: 1, label: 'Opening the door' }],
    sounds: [{ at: 0.3, id: 'door' }],
    object: 'door',
  })

  const startRoom = morning ? home.rooms.bedroom : home.rooms.living
  return {
    boxes,
    activities,
    start: { x: startRoom[0] + 0.4, z: startRoom[1] + 0.9, heading: 0 },
  }
}
