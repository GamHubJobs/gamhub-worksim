/**
 * Architecture & Interior Design: nine design tasks in Space Studio, from a
 * first flat layout to managing a fit-out's budget. Each is graded on the
 * player's actual design (rooms, doors, sizes, furniture, finishes, cost),
 * and colleagues review the file in the manager's reply. Simplified, fictional
 * briefs and prices: for learning.
 */
import type { AssignmentInput } from '../../schemas'
import * as P from './plans'

const feedback = (excellent: string, first: string) => ({
  excellent: `Hi {name},

${excellent}

Marguerite`,
  good: `Hi {name},

Good work: a few things to sort before it goes to the client. See the notes and the team's comments.

Marguerite`,
  pass: `Hi {name},

It is getting there, but it is not ready for the client yet. Read the notes carefully.

Marguerite`,
  fail: `Hi {name},

Not yet. ${first}

Marguerite`,
})

const career = 'architecture-interiors'
const check = <T extends Record<string, unknown>>(c: T) => c

const BEDS = ['bed-double', 'bed-king', 'bed-single']
const STORAGE = ['wardrobe', 'chest', 'cupboard']
const TABLES = ['meeting-table', 'dining-table-6', 'round-table', 'dining-table-4']
const PLANTS = ['plant-large', 'plant-small', 'planter']

export const archTwoBed: AssignmentInput = {
  id: 'arch-two-bed',
  version: 1,
  careerId: career,
  levelId: 'junior-designer',
  order: 1,
  kind: 'tool',
  title: 'A two-bedroom flat for Harbour Housing',
  summary:
    'Plan the inside of an empty flat: two bedrooms, a living room, kitchen, bathroom and hall.',
  estimatedMinutes: 40,
  from: 'manager',
  briefing: {
    subject: 'Harbour Housing: flat type B layout',
    body: `Hi {name},

Harbour Housing Association has a new block, and flat type B is an empty shell: 10 × 8 m, with the front door in the east wall. In **Space Studio**, open the task file and plan the inside.

They need:

- **two bedrooms** (each at least 7.5 m²; one is a double), each with a bed and somewhere to keep clothes;
- a **living room**, a **kitchen** (its own room, with a hob, a sink and a fridge), a **bathroom** and a **hall**;
- every room reached through doors from the front door;
- **daylight**: a window in every bedroom, the living room and the kitchen.

Do not move the outside walls: the structure is fixed. Set each room's **use** in its panel, so we can check it.

Marguerite`,
  },
  whyItMatters:
    'Most homes start as a shell and a brief. Getting the layout right (who walks through what, where the light comes from, whether the furniture fits) matters more than any finish chosen later.',
  objectives: [
    'Plan rooms to a brief inside a fixed shell',
    'Plan circulation from the entrance',
    'Furnish rooms to show they work',
  ],
  steps: [
    {
      id: 'rooms',
      title: 'Draw the rooms',
      instructions:
        "Press **R** and drag inside the shell, or type the size (e.g. 4000x3600) and press Enter. Set each room's name and use in the **Properties** panel.",
    },
    {
      id: 'doors',
      title: 'Doors and windows',
      instructions:
        'Press **D** and click a wall for each door; **N** for windows on the outside walls. The **Checks** tab shows any room that cannot be reached.',
    },
    {
      id: 'furnish',
      title: 'Furnish',
      instructions:
        'Open the **Library** (B): beds and wardrobes in the bedrooms; hob, sink and fridge in the kitchen.',
      hint: 'Search "bed", "wardrobe", "hob".',
    },
    {
      id: 'submit',
      title: 'Hand in',
      instructions: 'Check the **Checks** tab, then click **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'studio',
    title: 'Harbour Housing flat B',
    start: P.twoBedStart(),
    solution: P.twoBedSolution(),
    checks: [
      check({
        id: 'bedrooms',
        type: 'rooms',
        use: 'bedroom',
        min: 2,
        minArea: 7.5,
        title: 'Two bedrooms of at least 7.5 m²',
        points: 15,
        why: 'The brief is for two bedrooms; a single bedroom needs at least 7.5 m² (a common space standard).',
        hint: 'Draw two rooms and set their use to Bedroom.',
      }),
      check({
        id: 'living',
        type: 'rooms',
        use: 'living',
        min: 1,
        title: 'A living room',
        points: 5,
        why: 'Every home needs a living room.',
        hint: "Set a room's use to Living room.",
      }),
      check({
        id: 'kitchen',
        type: 'rooms',
        use: 'kitchen',
        min: 1,
        title: 'A kitchen',
        points: 5,
        why: 'The brief asks for a separate kitchen.',
        hint: "Set a room's use to Kitchen.",
      }),
      check({
        id: 'bathroom',
        type: 'rooms',
        use: 'bathroom',
        min: 1,
        title: 'A bathroom',
        points: 5,
        why: 'Every home needs a bathroom.',
        hint: "Set a room's use to Bathroom.",
      }),
      check({
        id: 'reach',
        type: 'reachable',
        title: 'Every room reached from the front door',
        points: 20,
        why: 'A room without a way in is not a room anyone can use.',
        hint: 'Open Checks: it names any room without a door to the rest of the flat.',
      }),
      check({
        id: 'light',
        type: 'windows',
        title: 'Daylight in every habitable room',
        points: 15,
        why: 'Bedrooms, living rooms and kitchens need natural light.',
        hint: 'Press N and click the outside wall of each room.',
      }),
      check({
        id: 'bedroom-kit',
        type: 'furnished',
        use: 'bedroom',
        items: [BEDS, STORAGE],
        title: 'Bedrooms with a bed and storage',
        points: 15,
        why: 'Furniture proves a bedroom works: a bed and a wardrobe must fit with room to move.',
        hint: 'Add a bed and a wardrobe or chest to each bedroom.',
      }),
      check({
        id: 'kitchen-kit',
        type: 'furnished',
        use: 'kitchen',
        items: [['hob-unit'], ['sink-unit'], ['fridge']],
        title: 'A kitchen with a hob, sink and fridge',
        points: 10,
        why: 'These three are the minimum for a working kitchen.',
        hint: 'Library › Kitchen.',
      }),
      check({
        id: 'shell',
        type: 'keeps-shell',
        title: 'The outside walls kept',
        points: 10,
        why: 'The structure is fixed in this block.',
        hint: 'Undo any change to the outside walls.',
      }),
    ],
  },
  passScore: 70,
  xp: 110,
  skills: { 'space-planning': 45, 'building-design': 20, accuracy: 10 },
  feedback: feedback(
    'That works: every room reached from the hall, light everywhere it is needed, and the furniture fits. It goes to Harbour Housing this week.',
    'Start with the rooms: two bedrooms, a living room, kitchen, bathroom and hall, each with its use set.',
  ),
}

export const archOffice: AssignmentInput = {
  id: 'arch-office',
  version: 1,
  careerId: career,
  levelId: 'junior-designer',
  order: 2,
  kind: 'tool',
  title: 'Furnish Lumen Analytics’ new office',
  summary:
    'Fit out an empty office: eight workstations, a meeting room for six, within the budget.',
  estimatedMinutes: 35,
  from: 'senior',
  briefing: {
    subject: 'Lumen Analytics: furniture plan',
    body: `Hi {name},

Lumen Analytics have taken an office on Wharf Road: an open-plan room, a meeting room and a tea point, all empty. The file is in **Space Studio**.

The brief:

- **eight workstations**, each with a chair, in the open-plan office;
- the **meeting room** with a table and **six** seats;
- nothing through a wall, on top of something else or in a door's way;
- the budget for furniture and finishes is in the file (the status bar shows the cost as you go).

Tobias`,
  },
  whyItMatters:
    'An office layout is a promise about how people will work. Desks need room round them, doors need to open, and the client has a budget that does not move.',
  objectives: [
    'Furnish to a headcount',
    'Keep clearances and doorways free',
    'Work within a budget',
  ],
  steps: [
    {
      id: 'desks',
      title: 'Workstations',
      instructions:
        'Library › Office: place a **Workstation with monitor** and an **Office chair**. Select both and press **Ctrl+D** to duplicate.',
    },
    {
      id: 'meeting',
      title: 'Meeting room',
      instructions: 'A table and six chairs. Chairs may tuck under the table.',
    },
    {
      id: 'check',
      title: 'Check',
      instructions:
        'The **Checks** tab lists any clash; the status bar shows cost against budget.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'studio',
    title: 'Lumen Analytics office',
    start: P.officeStart(),
    solution: P.officeSolution(),
    checks: [
      check({
        id: 'desks',
        type: 'capacity',
        use: 'open-plan',
        measure: 'workstations',
        min: 8,
        title: 'Eight workstations',
        points: 35,
        why: 'The client has eight staff on site.',
        hint: 'Place eight Workstations (or Desks) in the open-plan room.',
      }),
      check({
        id: 'seats',
        type: 'capacity',
        use: 'meeting',
        measure: 'seats',
        min: 6,
        title: 'Six seats in the meeting room',
        points: 25,
        why: 'Their weekly meeting is the whole team of six managers.',
        hint: 'Six chairs in the meeting room.',
      }),
      check({
        id: 'table',
        type: 'furnished',
        use: 'meeting',
        items: [TABLES],
        title: 'A meeting table',
        points: 10,
        why: 'A meeting room needs a table.',
        hint: 'Library › Meeting & reception.',
      }),
      check({
        id: 'clear',
        type: 'clear',
        title: 'No clashes',
        points: 15,
        why: "Furniture in a wall, on other furniture or in a door's swing cannot be built or used.",
        hint: 'Open Checks and click each clash to select it.',
      }),
      check({
        id: 'budget',
        type: 'budget',
        title: 'Within the budget',
        points: 15,
        why: "The client's budget is fixed.",
        hint: "Choose less expensive items: the panel shows each item's price.",
      }),
    ],
  },
  passScore: 70,
  xp: 110,
  skills: { 'interior-design': 40, 'client-briefs': 20, accuracy: 15 },
  feedback: feedback(
    'Spot on: eight desks with room to move, the meeting room seats six, and we are inside the budget.',
    'Start with the eight workstations in the open-plan room.',
  ),
}

export const archReception: AssignmentInput = {
  id: 'arch-reception',
  version: 1,
  careerId: career,
  levelId: 'junior-designer',
  order: 3,
  kind: 'tool',
  title: 'Redesign the Brightsmile reception',
  summary:
    'Fix a dental practice’s reception: accessible doors, a clear way in, seating, a hard-wearing floor.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Brightsmile Dental: reception refit',
    body: `Hi {name},

Brightsmile Dental's reception does not work. Patients with buggies and wheelchairs struggle with the narrow doors, the desk is right where the front door swings, two chairs sit on top of each other, and the carpet by the entrance is ruined. The file is in **Space Studio**.

Please:

- make both doors **accessible** (at least 775 mm clear: a 926 mm leaf);
- move the **reception desk** so nothing blocks a door, and clear any other clash;
- give **at least six seats** for waiting patients, and add a plant;
- change the floor to **tiles or stone**.

Marguerite`,
  },
  whyItMatters:
    'Reception is the first thing a client sees and the place everyone passes through. It has to be accessible, clear and durable before it is beautiful.',
  objectives: [
    'Make doors accessible',
    'Keep door swings and routes clear',
    'Choose durable finishes for heavy use',
  ],
  steps: [
    {
      id: 'doors',
      title: 'Doors',
      instructions: 'Select each door and set its **width** to 926 mm.',
    },
    {
      id: 'layout',
      title: 'Layout',
      instructions:
        'Move the desk away from the entrance; seat six; add a plant. Checks shows any clash.',
    },
    {
      id: 'floor',
      title: 'Floor',
      instructions: 'Select the room and choose a tile or stone floor.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'studio',
    title: 'Brightsmile reception',
    start: P.receptionStart(),
    solution: P.receptionSolution(),
    checks: [
      check({
        id: 'doors',
        type: 'accessible-doors',
        title: 'Accessible doors',
        points: 20,
        why: 'A clear width of 775 mm lets a wheelchair or buggy through.',
        hint: "Set each door's width to 926 mm.",
      }),
      check({
        id: 'clear',
        type: 'clear',
        title: "Nothing in a door's way, no clashes",
        points: 20,
        why: "A desk in the door's swing is a hazard and blocks the way in.",
        hint: 'Move the desk away from the entrance; separate the chairs.',
      }),
      check({
        id: 'seats',
        type: 'capacity',
        use: 'reception',
        measure: 'seats',
        min: 6,
        title: 'Six seats',
        points: 20,
        why: 'The practice sees up to six patients waiting at busy times.',
        hint: 'Add lounge chairs or a waiting bench.',
      }),
      check({
        id: 'floor',
        type: 'finishes',
        use: 'reception',
        groups: ['tile', 'stone'],
        title: 'A hard-wearing floor',
        points: 20,
        why: 'Carpet at an entrance wears out and holds dirt; tiles or stone last.',
        hint: 'Select the room; choose terrazzo, porcelain or limestone.',
      }),
      check({
        id: 'kit',
        type: 'furnished',
        use: 'reception',
        items: [['reception-desk'], PLANTS],
        title: 'A reception desk and a plant',
        points: 20,
        why: 'The desk stays; a plant softens the room.',
        hint: 'Library › Plants.',
      }),
    ],
  },
  passScore: 70,
  xp: 110,
  skills: { 'interior-design': 30, 'space-planning': 25, accuracy: 15 },
  feedback: feedback(
    'Much better: accessible doors, a clear way in and a floor that will last. The practice is delighted.',
    'Start with the doors: both need a 926 mm leaf.',
  ),
}

export const archTight: AssignmentInput = {
  id: 'arch-tight',
  version: 1,
  careerId: career,
  levelId: 'designer',
  order: 4,
  kind: 'tool',
  title: 'Make Northgate Lettings’ office work',
  summary: 'An overcrowded office: fit ten workstations properly, with nothing clashing.',
  estimatedMinutes: 35,
  from: 'senior',
  briefing: {
    subject: 'Northgate Lettings: the office is too tight',
    body: `Hi {name},

Northgate squeezed twelve desks into a 9 × 7 m office. They overlap, and one sits in the doorway. They have agreed to **ten** people in the room.

In **Space Studio**, re-plan it: **ten workstations** with chairs, nothing overlapping, in a wall or in a door's swing. The outside walls stay as they are.

Tobias`,
  },
  whyItMatters:
    'Squeezing in one more desk is the most common request in office design. The job is to show what fits safely, and to say no to what does not.',
  objectives: [
    'Plan to a density',
    'Clear clashes and door swings',
    'Work inside a fixed shell',
  ],
  steps: [
    {
      id: 'clear',
      title: 'Clear the room',
      instructions: 'Box-select (drag on empty floor) and delete what you will re-plan.',
    },
    {
      id: 'plan',
      title: 'Plan ten',
      instructions: 'Two rows of five fit: desks 1.6 m wide with chairs behind.',
    },
    {
      id: 'submit',
      title: 'Hand in',
      instructions: 'Check **Checks** is clear, then **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'studio',
    title: 'Northgate Lettings office',
    start: P.tightStart(),
    solution: P.tightSolution(),
    checks: [
      check({
        id: 'desks',
        type: 'capacity',
        use: 'open-plan',
        measure: 'workstations',
        min: 10,
        title: 'Ten workstations',
        points: 20,
        why: 'The client has agreed to ten people.',
        hint: 'Keep ten workstations.',
      }),
      check({
        id: 'clear',
        type: 'clear',
        title: 'No clashes, the door clear',
        points: 60,
        why: 'Overlapping desks and a blocked door are not a workable office.',
        hint: "Space the desks; nothing in the door's swing.",
      }),
      check({
        id: 'shell',
        type: 'keeps-shell',
        title: 'The outside walls kept',
        points: 20,
        why: 'They lease the room as it is.',
        hint: 'Undo changes to the outside walls.',
      }),
    ],
  },
  passScore: 75,
  xp: 120,
  skills: { 'space-planning': 40, 'interior-design': 25, accuracy: 15 },
  feedback: feedback(
    'That is how it should have been: ten desks, room to move, and a door that opens.',
    'Clear the clashes: the Checks tab lists each one.',
  ),
}

export const archCorrections: AssignmentInput = {
  id: 'arch-corrections',
  version: 1,
  careerId: career,
  levelId: 'designer',
  order: 5,
  kind: 'tool',
  title: 'Correct the flat B drawing',
  summary: 'Marguerite’s review found three errors in a colleague’s plan. Fix them.',
  estimatedMinutes: 25,
  from: 'manager',
  briefing: {
    subject: 'Flat B: corrections before issue',
    body: `Hi {name},

I reviewed flat B before it goes to Harbour Housing and found three errors:

1. **Bedroom 2 has no door.** Nobody can get in.
2. **Bedroom 2 has no window.**
3. **The bathroom floor is oak.** Wet rooms need tiles or stone.

Please correct them in **Space Studio** without changing the outside walls, and check nothing else has crept in.

Marguerite`,
  },
  whyItMatters:
    "Every drawing is checked before it leaves the practice. Correcting a reviewer's comments exactly, and checking you have not broken anything else, is a core professional habit.",
  objectives: ['Act on a design review', 'Check a plan for access, light and finishes'],
  steps: [
    {
      id: 'door',
      title: 'A door to bedroom 2',
      instructions: 'Press **D** and click the wall between the hall and bedroom 2.',
    },
    {
      id: 'window',
      title: 'A window',
      instructions: "Press **N** and click bedroom 2's outside wall.",
    },
    {
      id: 'floor',
      title: 'The bathroom floor',
      instructions: 'Select the bathroom; choose tiles.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'studio',
    title: 'Flat B for checking',
    start: P.correctionsStart(),
    solution: P.correctionsSolution(),
    checks: [
      check({
        id: 'reach',
        type: 'reachable',
        title: 'Bedroom 2 can be reached',
        points: 25,
        why: 'A room without a door cannot be used.',
        hint: 'Add a door between the hall and bedroom 2.',
      }),
      check({
        id: 'light',
        type: 'windows',
        title: 'Every habitable room has a window',
        points: 25,
        why: 'Bedrooms need daylight.',
        hint: 'Add a window to bedroom 2.',
      }),
      check({
        id: 'wet',
        type: 'finishes',
        use: 'bathroom',
        groups: ['tile', 'stone', 'concrete'],
        title: 'A water-resistant bathroom floor',
        points: 25,
        why: 'Timber swells and rots in a wet room.',
        hint: 'Select the bathroom and choose tiles.',
      }),
      check({
        id: 'shell',
        type: 'keeps-shell',
        title: 'The outside walls kept',
        points: 25,
        why: 'The structure is fixed.',
        hint: 'Undo changes to the outside walls.',
      }),
    ],
  },
  passScore: 75,
  xp: 100,
  skills: { 'building-design': 30, accuracy: 30, 'space-planning': 15 },
  feedback: feedback(
    'All three corrected, and nothing else broken. That is a drawing we can issue.',
    'Start with bedroom 2: it needs a door.',
  ),
}

export const archCommercial: AssignmentInput = {
  id: 'arch-commercial',
  version: 1,
  careerId: career,
  levelId: 'designer',
  order: 6,
  kind: 'tool',
  title: 'Plan the Fernhill Bakery shop unit',
  summary: 'An empty shop unit: a shop floor, an office, a store and an accessible WC.',
  estimatedMinutes: 40,
  from: 'manager',
  briefing: {
    subject: 'Fernhill Bakery: Market Street unit',
    body: `Hi {name},

Fernhill Bakery has leased a 15 × 10 m unit on Market Street, with double doors to the street. In **Space Studio**, plan:

- a **shop floor** of at least **60 m²**;
- an **office** (with a window), a **store**, and an **accessible WC**;
- every room reached through doors, and every door at least 775 mm clear.

Set each room's use (Shop floor, Office, Storage, WC).

Marguerite`,
  },
  whyItMatters:
    'Commercial buildings must work for staff and for the public: access, accessible facilities and clear routes are as much the brief as the shop floor itself.',
  objectives: [
    'Plan a small commercial building',
    'Provide accessible facilities',
    'Plan staff and public areas',
  ],
  steps: [
    {
      id: 'rooms',
      title: 'Rooms',
      instructions: 'Draw the shop floor first, then the back-of-house rooms.',
    },
    {
      id: 'doors',
      title: 'Doors and windows',
      instructions: 'Use the **Accessible door** from the Library for the WC.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'studio',
    title: 'Fernhill Bakery unit',
    start: P.commercialStart(),
    solution: P.commercialSolution(),
    checks: [
      check({
        id: 'shop',
        type: 'rooms',
        use: 'retail',
        min: 1,
        minArea: 60,
        title: 'A shop floor of 60 m² or more',
        points: 20,
        why: 'The bakery needs space for counters and a queue.',
        hint: "Set the big room's use to Shop floor.",
      }),
      check({
        id: 'office',
        type: 'rooms',
        use: 'office',
        min: 1,
        title: 'An office',
        points: 10,
        why: 'The manager needs somewhere to work.',
        hint: "Set a room's use to Office.",
      }),
      check({
        id: 'store',
        type: 'rooms',
        use: 'storage',
        min: 1,
        title: 'A store',
        points: 10,
        why: 'Stock needs a room of its own.',
        hint: "Set a room's use to Storage.",
      }),
      check({
        id: 'wc',
        type: 'rooms',
        use: 'wc',
        min: 1,
        title: 'A WC',
        points: 10,
        why: 'Staff and customers need a WC.',
        hint: "Set a room's use to WC.",
      }),
      check({
        id: 'reach',
        type: 'reachable',
        title: 'Every room reached',
        points: 20,
        why: 'Every room needs a way in.',
        hint: 'Open Checks.',
      }),
      check({
        id: 'access',
        type: 'accessible-doors',
        title: 'Accessible doors',
        points: 15,
        why: 'Public buildings must be usable by everyone.',
        hint: 'Doors of 900 mm or more.',
      }),
      check({
        id: 'light',
        type: 'windows',
        title: 'A window in the office',
        points: 15,
        why: 'People work there all day.',
        hint: 'Add a window on an outside wall.',
      }),
    ],
  },
  passScore: 75,
  xp: 130,
  skills: { 'building-design': 35, 'space-planning': 30, 'client-briefs': 15 },
  feedback: feedback(
    'A good, simple plan: a generous shop floor and everything the staff need behind it.',
    'Start with the shop floor: at least 60 m², its use set to Shop floor.',
  ),
}

export const archStorey: AssignmentInput = {
  id: 'arch-storey',
  version: 1,
  careerId: career,
  levelId: 'senior-designer',
  order: 7,
  kind: 'tool',
  title: 'A first floor for Orchard Close',
  summary: 'Add a storey: three bedrooms and a bathroom upstairs, reached by a stair.',
  estimatedMinutes: 50,
  from: 'manager',
  briefing: {
    subject: 'Orchard Close: the first floor',
    body: `Hi {name},

The Okafors' house at Orchard Close has its ground floor planned. They want a **first floor** with **three bedrooms** and a **bathroom**.

In **Space Studio**:

- add a floor above (the floor menu can copy the outside walls up);
- a **stair** from the ground-floor hall to a landing upstairs;
- three bedrooms and a bathroom, every room reached, every bedroom with a window.

Marguerite`,
  },
  whyItMatters:
    'Multi-storey design means thinking in section as well as plan: where the stair lands, what sits over what, and how people move between floors.',
  objectives: [
    'Add a storey to a building',
    'Plan a stair between floors',
    'Plan upstairs circulation',
  ],
  steps: [
    {
      id: 'floor',
      title: 'Add a floor',
      instructions:
        'Click **+** next to the floor menu. The outside walls are copied up.',
    },
    {
      id: 'stair',
      title: 'The stair',
      instructions:
        'On the ground floor, press **U** and click in the hall. It climbs to the new floor.',
    },
    {
      id: 'rooms',
      title: 'Upstairs',
      instructions:
        'A landing over the stair, then the bedrooms and bathroom with doors from it.',
    },
    {
      id: 'submit',
      title: 'Hand in',
      instructions: 'Walk it in 3D, then **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'studio',
    title: 'Orchard Close house',
    start: P.storeyStart(),
    solution: P.storeySolution(),
    checks: [
      check({
        id: 'floors',
        type: 'floors',
        min: 2,
        title: 'Two floors joined by a stair',
        points: 25,
        why: 'The first floor must be reached by a stair from below.',
        hint: 'Add a floor and a stair in the ground-floor hall.',
      }),
      check({
        id: 'bedrooms',
        type: 'rooms',
        use: 'bedroom',
        min: 3,
        minArea: 7.5,
        title: 'Three bedrooms of at least 7.5 m²',
        points: 20,
        why: 'The family needs three bedrooms.',
        hint: 'Set three upstairs rooms to Bedroom.',
      }),
      check({
        id: 'bathroom',
        type: 'rooms',
        use: 'bathroom',
        min: 1,
        title: 'A bathroom',
        points: 10,
        why: 'Upstairs needs a bathroom.',
        hint: "Set a room's use to Bathroom.",
      }),
      check({
        id: 'reach',
        type: 'reachable',
        title: 'Every room reached, up the stair',
        points: 25,
        why: 'The stair must land in a room with doors to the rest.',
        hint: "The stair's top must be inside the landing.",
      }),
      check({
        id: 'light',
        type: 'windows',
        title: 'Daylight in every habitable room',
        points: 20,
        why: 'Bedrooms need windows.',
        hint: 'Windows on the outside walls upstairs.',
      }),
    ],
  },
  passScore: 75,
  xp: 150,
  skills: { 'building-design': 45, 'space-planning': 30, accuracy: 15 },
  feedback: feedback(
    'A clear first floor: the stair lands on the landing and every bedroom has light. The Okafors want to walk it in 3D on Monday.',
    'Start by adding the floor, then the stair in the hall.',
  ),
}

export const archProposal: AssignmentInput = {
  id: 'arch-proposal',
  version: 1,
  careerId: career,
  levelId: 'senior-designer',
  order: 8,
  kind: 'tool',
  title: 'The show flat interior proposal',
  summary:
    'Finish and furnish Harbour Housing’s show flat within the budget, and write the design statement.',
  estimatedMinutes: 45,
  from: 'manager',
  briefing: {
    subject: 'Harbour Housing: show flat proposal',
    body: `Hi {name},

Harbour Housing want flat B as their **show flat**. Please prepare the interior proposal in **Space Studio**:

- **wet rooms** (bathroom and kitchen) in tiles or stone;
- a living room that **seats four**;
- everything clear of walls, doors and each other;
- **within the budget** in the file;
- a **design statement** of at least 80 words (Project tab) explaining the scheme to the client.

Marguerite`,
  },
  whyItMatters:
    'A proposal sells a design: the client needs to see it, trust it will last, know what it costs, and understand why it was chosen.',
  objectives: [
    'Specify finishes for use',
    'Furnish to a brief and a budget',
    'Explain a design in writing',
  ],
  steps: [
    {
      id: 'finishes',
      title: 'Finishes',
      instructions: 'Select the bathroom and kitchen; choose tiles or stone.',
    },
    {
      id: 'seating',
      title: 'Seating',
      instructions: 'Seat four in the living room (a three-seat sofa counts as three).',
    },
    {
      id: 'statement',
      title: 'Statement',
      instructions: 'Deselect everything; write the statement in **Project**.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'studio',
    title: 'Show flat interior',
    start: P.proposalStart(),
    solution: P.proposalSolution(),
    checks: [
      check({
        id: 'bath',
        type: 'finishes',
        use: 'bathroom',
        groups: ['tile', 'stone'],
        title: 'A tiled or stone bathroom floor',
        points: 15,
        why: 'Carpet in a bathroom is unhygienic and rots.',
        hint: 'Choose white tiles or porcelain.',
      }),
      check({
        id: 'kitchen',
        type: 'finishes',
        use: 'kitchen',
        groups: ['tile', 'stone'],
        title: 'A tiled or stone kitchen floor',
        points: 15,
        why: 'Kitchens get wet and greasy.',
        hint: 'Choose porcelain or terrazzo.',
      }),
      check({
        id: 'seats',
        type: 'capacity',
        use: 'living',
        measure: 'seats',
        min: 4,
        title: 'Seats for four in the living room',
        points: 20,
        why: 'A family of four should be able to sit together.',
        hint: 'A three-seat sofa and an armchair.',
      }),
      check({
        id: 'statement',
        type: 'statement',
        minWords: 80,
        title: 'A design statement',
        points: 20,
        why: 'The client needs to know why, not only what.',
        hint: 'Write at least 80 words in Project › Design statement.',
      }),
      check({
        id: 'budget',
        type: 'budget',
        title: 'Within the budget',
        points: 15,
        why: "The client's budget is fixed.",
        hint: 'Check the cost in the status bar.',
      }),
      check({
        id: 'clear',
        type: 'clear',
        title: 'No clashes',
        points: 15,
        why: 'Everything must fit and doors must open.',
        hint: 'Open Checks.',
      }),
    ],
  },
  passScore: 75,
  xp: 150,
  skills: { 'interior-design': 40, 'client-briefs': 30, 'technical-writing': 20 },
  feedback: feedback(
    'A lovely, sensible scheme, well explained and on budget. Harbour Housing approved it on the spot.',
    'Start with the wet rooms: tiles or stone in the bathroom and kitchen.',
  ),
}

export const archBudget: AssignmentInput = {
  id: 'arch-budget',
  version: 1,
  careerId: career,
  levelId: 'design-lead',
  order: 9,
  kind: 'tool',
  title: 'Bring the Kite & Co fit-out within budget',
  summary:
    'A studio fit-out is far over budget. Keep what the client needs and cut the rest.',
  estimatedMinutes: 40,
  from: 'manager',
  briefing: {
    subject: 'Kite & Co: the fit-out is over budget',
    body: `Hi {name},

The Kite & Co studio fit-out came back far over their budget: a junior specified a piano, a wall display, a reception desk nobody asked for and the most expensive desks we sell.

As design lead, bring it **within the budget** in the file, while keeping what the client needs: **six workstations**, **four seats** in the meeting room, and no clashes.

Marguerite`,
  },
  whyItMatters:
    "Value engineering, keeping the brief while cutting cost, is a design lead's daily work. The skill is knowing what the client needs and what they can do without.",
  objectives: [
    'Cost a design',
    'Cut cost without breaking the brief',
    'Make and explain trade-offs',
  ],
  steps: [
    {
      id: 'cost',
      title: 'See where the money goes',
      instructions: "Checks › Cost, and each item's price in its panel.",
    },
    {
      id: 'cut',
      title: 'Cut and swap',
      instructions: 'Remove what is not needed; swap expensive items for simpler ones.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'studio',
    title: 'Kite & Co studio',
    start: P.fitOutStart(),
    solution: P.fitOutSolution(),
    checks: [
      check({
        id: 'budget',
        type: 'budget',
        title: 'Within the budget',
        points: 40,
        why: 'The client cannot spend more.',
        hint: 'Remove the piano, display and reception desk; use simpler desks.',
      }),
      check({
        id: 'desks',
        type: 'capacity',
        use: 'open-plan',
        measure: 'workstations',
        min: 6,
        title: 'Six workstations kept',
        points: 20,
        why: 'Six people work in the studio.',
        hint: 'A Desk counts as a workstation.',
      }),
      check({
        id: 'seats',
        type: 'capacity',
        use: 'meeting',
        measure: 'seats',
        min: 4,
        title: 'Four meeting seats kept',
        points: 20,
        why: 'Client meetings are four people.',
        hint: 'Keep four chairs in the meeting room.',
      }),
      check({
        id: 'clear',
        type: 'clear',
        title: 'No clashes',
        points: 20,
        why: 'Everything must fit.',
        hint: 'Open Checks.',
      }),
    ],
  },
  passScore: 75,
  xp: 160,
  skills: { 'client-briefs': 40, 'interior-design': 25, accuracy: 20 },
  feedback: feedback(
    'Inside the budget with everything they need. That is exactly the conversation I want to have with Kite & Co.',
    "Start with the cost: the most expensive items are in the Checks tab and each item's panel.",
  ),
}

export const ARCHITECTURE_TASKS = [
  archTwoBed,
  archOffice,
  archReception,
  archTight,
  archCorrections,
  archCommercial,
  archStorey,
  archProposal,
  archBudget,
]
