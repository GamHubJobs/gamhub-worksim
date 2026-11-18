/**
 * Accessories and equipment: what the player can buy, own, wear and carry, and
 * what colleagues and people in town wear. Each item has the place on the body
 * it goes (its slot), a 3D model (world/character/accessories3d.tsx), a tier and
 * price (in pence, against weekly pay of £380 to £980), its colours, and what it
 * does, if anything (see game/accessories.ts: the time on a watch, quieter
 * surroundings in headphones, the safety kit a site checks for, the stethoscope
 * at the bedside, a badge at work, room in a bag for work things).
 *
 * Professional equipment is listed with the careers it belongs to. Nothing here
 * makes work easier than it is: equipment is what a professional would have, not
 * a shortcut through a task.
 */

/** Where on the body an item goes. One item per slot, except pockets. */
export type Slot =
  | 'head'
  | 'eyes'
  | 'ears'
  | 'earrings'
  | 'neck'
  | 'chest'
  | 'wrist'
  | 'wrist2'
  | 'ring'
  | 'hands'
  | 'body'
  | 'back'
  | 'carry'
  | 'belt'
  | 'pocket'
  | 'feet'

export const SLOT_NAMES: Record<Slot, string> = {
  head: 'Head',
  eyes: 'Eyes',
  ears: 'Ears',
  earrings: 'Earrings',
  neck: 'Neck',
  chest: 'Chest',
  wrist: 'Left wrist',
  wrist2: 'Right wrist',
  ring: 'Ring',
  hands: 'Hands',
  body: 'Over clothes',
  back: 'Bag',
  carry: 'In hand',
  belt: 'Belt',
  pocket: 'Pockets',
  feet: 'Feet',
}

/** How many things fit in the pockets at once. */
export const POCKETS = 4

export type Category =
  | 'wrist'
  | 'eyewear'
  | 'head'
  | 'audio'
  | 'jewellery'
  | 'bags'
  | 'footwear'
  | 'personal'
  | 'professional'

export const CATEGORIES: Array<{ id: Category; name: string }> = [
  { id: 'wrist', name: 'Watches & wrist' },
  { id: 'eyewear', name: 'Eyewear' },
  { id: 'head', name: 'Hats & helmets' },
  { id: 'audio', name: 'Audio' },
  { id: 'jewellery', name: 'Jewellery' },
  { id: 'bags', name: 'Bags' },
  { id: 'footwear', name: 'Footwear' },
  { id: 'personal', name: 'Personal items' },
  { id: 'professional', name: 'Professional equipment' },
]

export type Tier = 'basic' | 'standard' | 'premium' | 'luxury' | 'professional'

export const TIERS: Record<Tier, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
  luxury: 'Luxury',
  professional: 'Professional-grade',
}

/**
 * What an item does (game/accessories.ts):
 * - time: shows the time on the wrist; notifications: and unread messages;
 *   activity: and how the player is (energy, stress, last night's bedtime);
 * - audio: quieter surroundings while worn; noise-cancel: much quieter;
 * - ppe-*: the safety kit a site or workshop checks for (head, eyes, feet,
 *   high-visibility, hands, hearing);
 * - stethoscope: listened with at the bedside; id: a badge for work;
 * - carry-N: room for N work items (bags);
 * - tool: a work item (carried in the hand, on the belt, in a pocket or a bag).
 */
export type Use =
  | 'time'
  | 'notifications'
  | 'activity'
  | 'audio'
  | 'noise-cancel'
  | 'ppe-head'
  | 'ppe-eyes'
  | 'ppe-feet'
  | 'ppe-body'
  | 'ppe-hands'
  | 'ppe-ears'
  | 'stethoscope'
  | 'id'
  | 'carry-2'
  | 'carry-4'
  | 'carry-6'
  | 'tool'

/** The 3D model an item is drawn with (world/character/accessories3d.tsx). */
export type Model =
  | 'watch'
  | 'smartwatch'
  | 'tracker'
  | 'digital-watch'
  | 'bangle'
  | 'chain-bracelet'
  | 'esd-strap'
  | 'glasses'
  | 'sunglasses'
  | 'computer-glasses'
  | 'safety-glasses'
  | 'reading-glasses'
  | 'goggles'
  | 'cap'
  | 'beanie'
  | 'hardhat'
  | 'helmet'
  | 'scrub-cap'
  | 'trilby'
  | 'earbuds'
  | 'headphones'
  | 'gaming-headset'
  | 'comms-headset'
  | 'earmuffs'
  | 'ring'
  | 'signet'
  | 'necklace'
  | 'chain'
  | 'studs'
  | 'hoops'
  | 'backpack'
  | 'laptop-bag'
  | 'shoulder-bag'
  | 'briefcase'
  | 'document-bag'
  | 'sneakers'
  | 'formal-shoes'
  | 'safety-boots'
  | 'sandals'
  | 'wallet'
  | 'belt'
  | 'phone-case'
  | 'keys'
  | 'hivis-vest'
  | 'work-gloves'
  | 'nitrile-gloves'
  | 'tool-belt'
  | 'tape-measure'
  | 'laser-measure'
  | 'multimeter'
  | 'stethoscope'
  | 'fob-watch'
  | 'badge'
  | 'penlight'
  | 'folder'
  | 'calculator'
  | 'tablet'
  | 'toolkit'
  | 'usb-drive'
  | 'ssd'
  | 'cable-tester'
  | 'camera'
  | 'microphone'
  | 'tripod'
  | 'recorder'
  | 'clicker'
  | 'security-key'
  | 'rubber-duck'

export interface Accessory {
  id: string
  name: string
  category: Category
  slot: Slot
  model: Model
  tier: Tier
  /** In pence. */
  price: number
  /** The colours it comes in (the first is the main one). */
  colours: string[]
  description: string
  uses?: Use[]
  /** Professional equipment: the careers it belongs to. */
  careers?: string[]
  /** Over the top of the head (a headphone band): clashes with hats. */
  band?: boolean
  /** Covers the top of the head (hats): clashes with headphone bands. */
  crown?: boolean
  /** Can be sold on (not professional safety kit, which is personal issue). */
  sellable?: boolean
}

const ENG = 'engineering-services'
const HEALTH = 'healthcare'
const LAW = 'legal'
const IT = 'it-support'
const FIN = 'office-admin-finance'
const MKT = 'digital-marketing'
const ACC = 'accounting'
const DATA = 'data-analytics'
const DEV = 'software-development'

/** £ to pence. */
const p = (pounds: number) => Math.round(pounds * 100)

export const ACCESSORIES: Accessory[] = [
  // A. Wrist
  {
    id: 'watch-classic',
    name: 'Classic analogue watch',
    category: 'wrist',
    slot: 'wrist',
    model: 'watch',
    tier: 'standard',
    price: p(65),
    colours: ['#78350f', '#111827', '#e5e7eb'],
    description: 'A round steel face on a leather strap. Tells the time at a glance.',
    uses: ['time'],
  },
  {
    id: 'watch-dress',
    name: 'Gold dress watch',
    category: 'wrist',
    slot: 'wrist',
    model: 'watch',
    tier: 'luxury',
    price: p(1250),
    colours: ['#b45309', '#1c1917'],
    description: 'A slim gold case on a fine strap: for interviews and weddings.',
    uses: ['time'],
  },
  {
    id: 'watch-smart',
    name: 'Smartwatch',
    category: 'wrist',
    slot: 'wrist',
    model: 'smartwatch',
    tier: 'premium',
    price: p(249),
    colours: ['#0f172a', '#f1f5f9', '#be185d'],
    description:
      'Shows the time, your unread messages and how you are (energy, stress and when you went to bed).',
    uses: ['time', 'notifications', 'activity'],
  },
  {
    id: 'fitness-tracker',
    name: 'Fitness tracker',
    category: 'wrist',
    slot: 'wrist',
    model: 'tracker',
    tier: 'standard',
    price: p(45),
    colours: ['#16a34a', '#0f172a', '#7c3aed'],
    description:
      'A slim band that keeps an eye on your energy and stress, and when you went to bed.',
    uses: ['time', 'activity'],
  },
  {
    id: 'watch-digital',
    name: 'Digital watch',
    category: 'wrist',
    slot: 'wrist',
    model: 'digital-watch',
    tier: 'basic',
    price: p(15),
    colours: ['#1f2937', '#0369a1'],
    description: 'A tough resin digital watch with a backlight.',
    uses: ['time'],
  },
  {
    id: 'bangle-silver',
    name: 'Silver bangle',
    category: 'jewellery',
    slot: 'wrist2',
    model: 'bangle',
    tier: 'premium',
    price: p(120),
    colours: ['#d1d5db', '#b45309'],
    description: 'A plain polished bangle.',
  },
  {
    id: 'bracelet-chain',
    name: 'Chain bracelet',
    category: 'jewellery',
    slot: 'wrist2',
    model: 'chain-bracelet',
    tier: 'standard',
    price: p(40),
    colours: ['#d1d5db', '#ca8a04'],
    description: 'A fine link bracelet.',
  },
  {
    id: 'bracelet-beads',
    name: 'Bead bracelet',
    category: 'jewellery',
    slot: 'wrist2',
    model: 'bangle',
    tier: 'basic',
    price: p(8),
    colours: ['#92400e', '#1e3a8a', '#065f46'],
    description: 'Wooden beads on an elastic cord.',
  },
  // B. Eyewear
  {
    id: 'glasses-prescription',
    name: 'Prescription glasses',
    category: 'eyewear',
    slot: 'eyes',
    model: 'glasses',
    tier: 'standard',
    price: p(95),
    colours: ['#111827', '#7c2d12', '#64748b'],
    description: 'Everyday glasses with a lightweight frame.',
  },
  {
    id: 'glasses-designer',
    name: 'Designer frames',
    category: 'eyewear',
    slot: 'eyes',
    model: 'glasses',
    tier: 'luxury',
    price: p(320),
    colours: ['#b45309', '#0f172a'],
    description: 'Hand-finished acetate frames.',
  },
  {
    id: 'sunglasses',
    name: 'Sunglasses',
    category: 'eyewear',
    slot: 'eyes',
    model: 'sunglasses',
    tier: 'standard',
    price: p(35),
    colours: ['#111827', '#92400e', '#1e40af'],
    description: 'Tinted lenses for bright days out.',
  },
  {
    id: 'sunglasses-premium',
    name: 'Polarised sunglasses',
    category: 'eyewear',
    slot: 'eyes',
    model: 'sunglasses',
    tier: 'premium',
    price: p(140),
    colours: ['#0f172a', '#b45309'],
    description: 'Polarised lenses that cut glare off wet roads and water.',
  },
  {
    id: 'glasses-computer',
    name: 'Computer glasses',
    category: 'eyewear',
    slot: 'eyes',
    model: 'computer-glasses',
    tier: 'standard',
    price: p(55),
    colours: ['#334155', '#0f766e'],
    description: 'A faint blue-light filter for long days at a screen.',
    careers: [DEV, DATA, ACC, IT],
  },
  {
    id: 'glasses-reading',
    name: 'Reading glasses',
    category: 'eyewear',
    slot: 'eyes',
    model: 'reading-glasses',
    tier: 'basic',
    price: p(18),
    colours: ['#7f1d1d', '#111827'],
    description: 'Half-frame readers for small print and long documents.',
    careers: [LAW, ACC, FIN],
  },
  {
    id: 'glasses-safety',
    name: 'Safety glasses',
    category: 'professional',
    slot: 'eyes',
    model: 'safety-glasses',
    tier: 'professional',
    price: p(22),
    colours: ['#e0f2fe', '#fde68a'],
    description:
      'Impact-rated wraparound glasses: what the workshop and site expect beyond the signs.',
    uses: ['ppe-eyes'],
    careers: [ENG, IT],
  },
  {
    id: 'goggles',
    name: 'Sealed safety goggles',
    category: 'professional',
    slot: 'eyes',
    model: 'goggles',
    tier: 'professional',
    price: p(28),
    colours: ['#bae6fd'],
    description: 'Sealed goggles for grinding, cutting and dust.',
    uses: ['ppe-eyes'],
    careers: [ENG],
  },
  // C. Head
  {
    id: 'cap',
    name: 'Baseball cap',
    category: 'head',
    slot: 'head',
    model: 'cap',
    tier: 'basic',
    price: p(14),
    colours: ['#1e3a8a', '#111827', '#b91c1c', '#f8fafc'],
    description: 'A six-panel cotton cap.',
    crown: true,
    sellable: true,
  },
  {
    id: 'beanie',
    name: 'Knitted beanie',
    category: 'head',
    slot: 'head',
    model: 'beanie',
    tier: 'basic',
    price: p(12),
    colours: ['#334155', '#9f1239', '#ca8a04', '#065f46'],
    description: 'A warm ribbed beanie for cold mornings.',
    crown: true,
    sellable: true,
  },
  {
    id: 'trilby',
    name: 'Wool trilby',
    category: 'head',
    slot: 'head',
    model: 'trilby',
    tier: 'premium',
    price: p(85),
    colours: ['#44403c', '#1c1917'],
    description: 'A smart felt hat with a band.',
    crown: true,
    sellable: true,
  },
  {
    id: 'hardhat',
    name: 'Hard hat',
    category: 'professional',
    slot: 'head',
    model: 'hardhat',
    tier: 'professional',
    price: p(38),
    colours: ['#f8fafc', '#facc15', '#2563eb', '#ea580c'],
    description:
      'A vented safety helmet with a ratchet harness: required on site and in the yard.',
    uses: ['ppe-head'],
    careers: [ENG],
    crown: true,
  },
  {
    id: 'helmet-cycle',
    name: 'Cycle helmet',
    category: 'head',
    slot: 'head',
    model: 'helmet',
    tier: 'standard',
    price: p(55),
    colours: ['#0f172a', '#dc2626', '#f8fafc'],
    description: 'A vented helmet for riding to work.',
    crown: true,
    sellable: true,
  },
  {
    id: 'scrub-cap',
    name: 'Scrub cap',
    category: 'professional',
    slot: 'head',
    model: 'scrub-cap',
    tier: 'professional',
    price: p(12),
    colours: ['#0e7490', '#1d4ed8', '#7c3aed'],
    description: 'A washable cotton cap for clinical areas.',
    careers: [HEALTH],
    crown: true,
  },
  // D. Audio
  {
    id: 'earbuds',
    name: 'Wireless earbuds',
    category: 'audio',
    slot: 'ears',
    model: 'earbuds',
    tier: 'standard',
    price: p(59),
    colours: ['#f8fafc', '#111827'],
    description: 'Small earbuds: the world around you a little quieter.',
    uses: ['audio'],
    sellable: true,
  },
  {
    id: 'earbuds-pro',
    name: 'Noise-cancelling earbuds',
    category: 'audio',
    slot: 'ears',
    model: 'earbuds',
    tier: 'premium',
    price: p(199),
    colours: ['#f8fafc', '#0f172a'],
    description: 'Active noise cancelling: street and office noise fades right down.',
    uses: ['audio', 'noise-cancel'],
    sellable: true,
  },
  {
    id: 'headphones',
    name: 'Over-ear headphones',
    category: 'audio',
    slot: 'ears',
    model: 'headphones',
    tier: 'standard',
    price: p(75),
    colours: ['#111827', '#e5e7eb', '#1e3a8a'],
    description: 'Comfortable over-ear headphones.',
    uses: ['audio'],
    band: true,
    sellable: true,
    careers: [MKT, DATA, DEV],
  },
  {
    id: 'headphones-luxury',
    name: 'Studio headphones',
    category: 'audio',
    slot: 'ears',
    model: 'headphones',
    tier: 'luxury',
    price: p(420),
    colours: ['#78350f', '#0f172a'],
    description: 'Leather and aluminium, with noise cancelling.',
    uses: ['audio', 'noise-cancel'],
    band: true,
    sellable: true,
    careers: [MKT],
  },
  {
    id: 'headset-gaming',
    name: 'Gaming headset',
    category: 'audio',
    slot: 'ears',
    model: 'gaming-headset',
    tier: 'standard',
    price: p(69),
    colours: ['#111827', '#dc2626', '#16a34a'],
    description: 'Closed cups and a flip-up microphone for evenings in.',
    uses: ['audio'],
    band: true,
    sellable: true,
  },
  {
    id: 'headset-comms',
    name: 'Office headset',
    category: 'professional',
    slot: 'ears',
    model: 'comms-headset',
    tier: 'professional',
    price: p(89),
    colours: ['#111827'],
    description:
      'A single-ear headset with a noise-cancelling microphone, for calls on the service desk.',
    uses: ['audio'],
    careers: [IT, FIN, MKT],
    band: true,
  },
  {
    id: 'earmuffs',
    name: 'Hearing protection',
    category: 'professional',
    slot: 'ears',
    model: 'earmuffs',
    tier: 'professional',
    price: p(24),
    colours: ['#ea580c', '#facc15'],
    description: 'Ear defenders for the workshop and the plant room.',
    uses: ['ppe-ears', 'audio', 'noise-cancel'],
    careers: [ENG],
    band: true,
  },
  // E. Jewellery
  {
    id: 'ring-band',
    name: 'Plain band ring',
    category: 'jewellery',
    slot: 'ring',
    model: 'ring',
    tier: 'standard',
    price: p(60),
    colours: ['#d1d5db', '#ca8a04'],
    description: 'A plain polished band.',
    sellable: true,
  },
  {
    id: 'ring-signet',
    name: 'Signet ring',
    category: 'jewellery',
    slot: 'ring',
    model: 'signet',
    tier: 'luxury',
    price: p(380),
    colours: ['#ca8a04', '#d1d5db'],
    description: 'A heavy signet with a flat face.',
    sellable: true,
  },
  {
    id: 'necklace',
    name: 'Pendant necklace',
    category: 'jewellery',
    slot: 'neck',
    model: 'necklace',
    tier: 'premium',
    price: p(150),
    colours: ['#d1d5db', '#ca8a04'],
    description: 'A fine chain with a small pendant.',
    sellable: true,
  },
  {
    id: 'chain',
    name: 'Curb chain',
    category: 'jewellery',
    slot: 'neck',
    model: 'chain',
    tier: 'standard',
    price: p(55),
    colours: ['#d1d5db', '#ca8a04'],
    description: 'A chunky curb-link chain.',
    sellable: true,
  },
  {
    id: 'chain-gold',
    name: 'Gold chain',
    category: 'jewellery',
    slot: 'neck',
    model: 'chain',
    tier: 'luxury',
    price: p(890),
    colours: ['#ca8a04'],
    description: 'A solid gold chain.',
    sellable: true,
  },
  {
    id: 'earrings-studs',
    name: 'Stud earrings',
    category: 'jewellery',
    slot: 'earrings',
    model: 'studs',
    tier: 'standard',
    price: p(35),
    colours: ['#e5e7eb', '#ca8a04', '#60a5fa'],
    description: 'Small round studs.',
    sellable: true,
  },
  {
    id: 'earrings-hoops',
    name: 'Hoop earrings',
    category: 'jewellery',
    slot: 'earrings',
    model: 'hoops',
    tier: 'premium',
    price: p(110),
    colours: ['#ca8a04', '#d1d5db'],
    description: 'Medium hoops.',
    sellable: true,
  },
  // F. Bags
  {
    id: 'backpack',
    name: 'Everyday backpack',
    category: 'bags',
    slot: 'back',
    model: 'backpack',
    tier: 'basic',
    price: p(25),
    colours: ['#1e3a8a', '#111827', '#065f46', '#9f1239'],
    description: 'Room for lunch, a water bottle and two work things.',
    uses: ['carry-2'],
    sellable: true,
  },
  {
    id: 'backpack-tech',
    name: 'Commuter backpack',
    category: 'bags',
    slot: 'back',
    model: 'backpack',
    tier: 'premium',
    price: p(140),
    colours: ['#0f172a', '#334155'],
    description:
      'A padded laptop sleeve and organised pockets: room for six work things.',
    uses: ['carry-6'],
    sellable: true,
  },
  {
    id: 'laptop-bag',
    name: 'Laptop bag',
    category: 'bags',
    slot: 'back',
    model: 'laptop-bag',
    tier: 'standard',
    price: p(48),
    colours: ['#111827', '#57534e'],
    description: 'A padded shoulder bag for a laptop and four work things.',
    uses: ['carry-4'],
    sellable: true,
  },
  {
    id: 'shoulder-bag',
    name: 'Leather shoulder bag',
    category: 'bags',
    slot: 'back',
    model: 'shoulder-bag',
    tier: 'luxury',
    price: p(450),
    colours: ['#78350f', '#1c1917', '#9f1239'],
    description: 'Full-grain leather that softens with age. Room for two work things.',
    uses: ['carry-2'],
    sellable: true,
  },
  {
    id: 'briefcase',
    name: 'Briefcase',
    category: 'bags',
    slot: 'carry',
    model: 'briefcase',
    tier: 'premium',
    price: p(180),
    colours: ['#1c1917', '#78350f'],
    description:
      'A hard-sided briefcase with combination locks: room for four work things.',
    uses: ['carry-4'],
    careers: [LAW, FIN, ACC],
    sellable: true,
  },
  {
    id: 'document-bag',
    name: 'Barrister’s document bag',
    category: 'professional',
    slot: 'carry',
    model: 'document-bag',
    tier: 'professional',
    price: p(95),
    colours: ['#7f1d1d', '#1e3a8a'],
    description: 'A cloth bag for case papers and the court bundle: six work things.',
    uses: ['carry-6'],
    careers: [LAW],
  },
  // G. Footwear and personal items
  {
    id: 'sneakers',
    name: 'Trainers',
    category: 'footwear',
    slot: 'feet',
    model: 'sneakers',
    tier: 'standard',
    price: p(60),
    colours: ['#f8fafc', '#111827', '#dc2626'],
    description: 'Cushioned everyday trainers.',
    sellable: true,
  },
  {
    id: 'sneakers-premium',
    name: 'Leather trainers',
    category: 'footwear',
    slot: 'feet',
    model: 'sneakers',
    tier: 'premium',
    price: p(130),
    colours: ['#f8fafc', '#78350f'],
    description: 'Clean leather trainers.',
    sellable: true,
  },
  {
    id: 'formal-shoes',
    name: 'Oxford shoes',
    category: 'footwear',
    slot: 'feet',
    model: 'formal-shoes',
    tier: 'premium',
    price: p(110),
    colours: ['#111827', '#78350f'],
    description: 'Polished leather lace-ups for the office and court.',
    sellable: true,
  },
  {
    id: 'safety-boots',
    name: 'Safety boots',
    category: 'professional',
    slot: 'feet',
    model: 'safety-boots',
    tier: 'professional',
    price: p(75),
    colours: ['#3f2d1f', '#111827'],
    description: 'Steel toe caps and midsoles: required on site.',
    uses: ['ppe-feet'],
    careers: [ENG],
  },
  {
    id: 'sandals',
    name: 'Sandals',
    category: 'footwear',
    slot: 'feet',
    model: 'sandals',
    tier: 'basic',
    price: p(20),
    colours: ['#78350f', '#111827'],
    description: 'For the park and the weekend. Not for work.',
    sellable: true,
  },
  {
    id: 'wallet',
    name: 'Leather wallet',
    category: 'personal',
    slot: 'pocket',
    model: 'wallet',
    tier: 'standard',
    price: p(30),
    colours: ['#78350f', '#111827'],
    description: 'Cards, cash and receipts in one place.',
    sellable: true,
  },
  {
    id: 'belt-leather',
    name: 'Leather belt',
    category: 'personal',
    slot: 'belt',
    model: 'belt',
    tier: 'standard',
    price: p(28),
    colours: ['#78350f', '#111827'],
    description: 'A classic belt with a brushed buckle.',
    sellable: true,
  },
  {
    id: 'phone-case',
    name: 'Phone case',
    category: 'personal',
    slot: 'pocket',
    model: 'phone-case',
    tier: 'basic',
    price: p(12),
    colours: ['#1d4ed8', '#be185d', '#111827', '#16a34a'],
    description: 'A grippy case: the phone in your hand shows it.',
    sellable: true,
  },
  {
    id: 'keyring',
    name: 'Key holder',
    category: 'personal',
    slot: 'pocket',
    model: 'keys',
    tier: 'basic',
    price: p(9),
    colours: ['#d1d5db', '#ca8a04'],
    description: 'Keys on a clip at the belt.',
    sellable: true,
  },
  // Professional: engineering
  {
    id: 'hivis-vest',
    name: 'High-visibility vest',
    category: 'professional',
    slot: 'body',
    model: 'hivis-vest',
    tier: 'professional',
    price: p(9),
    colours: ['#facc15', '#f97316'],
    description: 'Class 2 hi-vis over your clothes: required on site.',
    uses: ['ppe-body'],
    careers: [ENG],
  },
  {
    id: 'work-gloves',
    name: 'Cut-resistant gloves',
    category: 'professional',
    slot: 'hands',
    model: 'work-gloves',
    tier: 'professional',
    price: p(14),
    colours: ['#475569', '#f59e0b'],
    description: 'Cut level C gloves for handling steel and sheet.',
    uses: ['ppe-hands'],
    careers: [ENG],
  },
  {
    id: 'tool-belt',
    name: 'Tool belt',
    category: 'professional',
    slot: 'belt',
    model: 'tool-belt',
    tier: 'professional',
    price: p(42),
    colours: ['#78350f', '#111827'],
    description:
      'Pouches for a hammer, screwdrivers, a pencil and a tape: two work things.',
    uses: ['carry-2', 'tool'],
    careers: [ENG],
  },
  {
    id: 'tape-measure',
    name: '8 m tape measure',
    category: 'professional',
    slot: 'pocket',
    model: 'tape-measure',
    tier: 'professional',
    price: p(16),
    colours: ['#facc15'],
    description: 'A steel tape with a magnetic hook.',
    uses: ['tool'],
    careers: [ENG],
  },
  {
    id: 'laser-measure',
    name: 'Laser distance meter',
    category: 'professional',
    slot: 'pocket',
    model: 'laser-measure',
    tier: 'professional',
    price: p(85),
    colours: ['#ea580c'],
    description: 'Measures up to 50 m to a millimetre or two.',
    uses: ['tool'],
    careers: [ENG],
  },
  {
    id: 'multimeter',
    name: 'Multimeter',
    category: 'professional',
    slot: 'carry',
    model: 'multimeter',
    tier: 'professional',
    price: p(120),
    colours: ['#facc15'],
    description: 'A CAT III meter for proving circuits dead before work.',
    uses: ['tool'],
    careers: [ENG],
  },
  // Professional: healthcare
  {
    id: 'stethoscope',
    name: 'Stethoscope',
    category: 'professional',
    slot: 'neck',
    model: 'stethoscope',
    tier: 'professional',
    price: p(65),
    colours: ['#1f2937', '#1d4ed8', '#7c3aed'],
    description: 'A dual-head stethoscope of your own for the bedside.',
    uses: ['stethoscope'],
    careers: [HEALTH],
  },
  {
    id: 'fob-watch',
    name: 'Nurse’s fob watch',
    category: 'professional',
    slot: 'chest',
    model: 'fob-watch',
    tier: 'professional',
    price: p(18),
    colours: ['#0ea5e9', '#e11d48', '#16a34a'],
    description:
      'A silicone fob watch pinned to the chest: bare below the elbows, and the time to hand.',
    uses: ['time'],
    careers: [HEALTH],
  },
  {
    id: 'badge-medical',
    name: 'Medical ID badge',
    category: 'professional',
    slot: 'neck',
    model: 'badge',
    tier: 'professional',
    price: p(6),
    colours: ['#0f766e'],
    description: 'Your photo ID on a breakaway lanyard.',
    uses: ['id'],
    careers: [HEALTH],
  },
  {
    id: 'penlight',
    name: 'Pupil penlight',
    category: 'professional',
    slot: 'pocket',
    model: 'penlight',
    tier: 'professional',
    price: p(9),
    colours: ['#e5e7eb'],
    description: 'A clinical penlight with a pupil gauge.',
    uses: ['tool'],
    careers: [HEALTH],
  },
  {
    id: 'nitrile-gloves',
    name: 'Nitrile gloves',
    category: 'professional',
    slot: 'hands',
    model: 'nitrile-gloves',
    tier: 'professional',
    price: p(7),
    colours: ['#60a5fa', '#a78bfa'],
    description: 'A box of single-use gloves for personal care.',
    uses: ['ppe-hands'],
    careers: [HEALTH],
  },
  // Professional: law
  {
    id: 'badge-court',
    name: 'Court ID badge',
    category: 'professional',
    slot: 'neck',
    model: 'badge',
    tier: 'professional',
    price: p(6),
    colours: ['#7f1d1d'],
    description: 'Your firm and court-user ID on a lanyard.',
    uses: ['id'],
    careers: [LAW],
  },
  {
    id: 'folder-legal',
    name: 'Case folder',
    category: 'professional',
    slot: 'carry',
    model: 'folder',
    tier: 'professional',
    price: p(15),
    colours: ['#7f1d1d', '#1e3a8a', '#14532d'],
    description: 'A ring-bound folder with dividers, for the papers on a matter.',
    uses: ['tool'],
    careers: [LAW, FIN, ACC],
  },
  // Professional: IT
  {
    id: 'toolkit-it',
    name: 'Technician’s toolkit',
    category: 'professional',
    slot: 'carry',
    model: 'toolkit',
    tier: 'professional',
    price: p(65),
    colours: ['#1d4ed8', '#111827'],
    description: 'Precision drivers, spudgers, a crimper and spare screws in a zip case.',
    uses: ['tool'],
    careers: [IT],
  },
  {
    id: 'usb-drive',
    name: 'Encrypted USB drive',
    category: 'professional',
    slot: 'pocket',
    model: 'usb-drive',
    tier: 'professional',
    price: p(35),
    colours: ['#64748b'],
    description: 'Hardware-encrypted, for moving files the approved way.',
    uses: ['tool'],
    careers: [IT, DATA, DEV],
  },
  {
    id: 'ssd',
    name: 'Portable SSD',
    category: 'professional',
    slot: 'pocket',
    model: 'ssd',
    tier: 'professional',
    price: p(90),
    colours: ['#1e293b', '#b91c1c'],
    description: 'A rugged 1 TB drive for images and backups.',
    uses: ['tool'],
    careers: [IT, MKT, DATA],
  },
  {
    id: 'esd-strap',
    name: 'Anti-static wrist strap',
    category: 'professional',
    slot: 'wrist2',
    model: 'esd-strap',
    tier: 'professional',
    price: p(8),
    colours: ['#2563eb'],
    description: 'Grounds you before opening a computer, so nothing is damaged.',
    uses: ['tool'],
    careers: [IT],
  },
  {
    id: 'cable-tester',
    name: 'Network cable tester',
    category: 'professional',
    slot: 'pocket',
    model: 'cable-tester',
    tier: 'professional',
    price: p(28),
    colours: ['#f97316'],
    description: 'Checks each pair of a network cable end to end.',
    uses: ['tool'],
    careers: [IT],
  },
  {
    id: 'badge-staff',
    name: 'Staff ID badge',
    category: 'professional',
    slot: 'neck',
    model: 'badge',
    tier: 'professional',
    price: p(6),
    colours: ['#1d4ed8', '#16a34a', '#ea580c'],
    description: 'Your photo ID and door pass on a lanyard.',
    uses: ['id'],
    careers: [IT, FIN, ACC, MKT, DATA, DEV, ENG],
  },
  // Professional: finance and administration, accounting
  {
    id: 'calculator',
    name: 'Desktop calculator',
    category: 'professional',
    slot: 'carry',
    model: 'calculator',
    tier: 'professional',
    price: p(22),
    colours: ['#1f2937', '#e5e7eb'],
    description: 'A 12-digit calculator with tax and mark-up keys.',
    uses: ['tool'],
    careers: [FIN, ACC],
  },
  {
    id: 'tablet',
    name: 'Work tablet',
    category: 'professional',
    slot: 'carry',
    model: 'tablet',
    tier: 'professional',
    price: p(329),
    colours: ['#334155', '#e5e7eb'],
    description: 'A tablet with a keyboard cover, for notes in meetings.',
    uses: ['tool'],
    careers: [FIN, ACC, DATA, LAW, MKT],
  },
  // Professional: digital marketing
  {
    id: 'camera',
    name: 'Mirrorless camera',
    category: 'professional',
    slot: 'neck',
    model: 'camera',
    tier: 'professional',
    price: p(649),
    colours: ['#111827'],
    description: 'A compact mirrorless camera with a zoom lens, on a neck strap.',
    uses: ['tool'],
    careers: [MKT],
  },
  {
    id: 'microphone',
    name: 'Handheld microphone',
    category: 'professional',
    slot: 'carry',
    model: 'microphone',
    tier: 'professional',
    price: p(110),
    colours: ['#1f2937'],
    description: 'A dynamic microphone for interviews and voice-overs.',
    uses: ['tool'],
    careers: [MKT],
  },
  {
    id: 'tripod',
    name: 'Travel tripod',
    category: 'professional',
    slot: 'carry',
    model: 'tripod',
    tier: 'professional',
    price: p(79),
    colours: ['#111827'],
    description: 'A folding tripod with a ball head.',
    uses: ['tool'],
    careers: [MKT],
  },
  {
    id: 'recorder',
    name: 'Portable audio recorder',
    category: 'professional',
    slot: 'pocket',
    model: 'recorder',
    tier: 'professional',
    price: p(99),
    colours: ['#334155'],
    description: 'A pocket recorder with stereo microphones.',
    uses: ['tool'],
    careers: [MKT],
  },
  // Professional: data analysis, software development
  {
    id: 'clicker',
    name: 'Presentation clicker',
    category: 'professional',
    slot: 'pocket',
    model: 'clicker',
    tier: 'professional',
    price: p(29),
    colours: ['#111827'],
    description: 'Moves the slides on, with a laser pointer.',
    uses: ['tool'],
    careers: [DATA, MKT, FIN],
  },
  {
    id: 'security-key',
    name: 'Hardware security key',
    category: 'professional',
    slot: 'pocket',
    model: 'security-key',
    tier: 'professional',
    price: p(45),
    colours: ['#111827'],
    description: 'A second factor for signing in to code hosting and production.',
    uses: ['tool'],
    careers: [DEV, IT],
  },
  {
    id: 'rubber-duck',
    name: 'Debugging duck',
    category: 'professional',
    slot: 'carry',
    model: 'rubber-duck',
    tier: 'basic',
    price: p(5),
    colours: ['#facc15'],
    description:
      'Explain the bug to the duck, line by line. It works more often than you’d think.',
    careers: [DEV],
    sellable: true,
  },
]

const BY_ID = new Map(ACCESSORIES.map((a) => [a.id, a]))

export function getAccessory(id: string): Accessory | undefined {
  return BY_ID.get(id)
}

/** The professional equipment for a career (listed with it). */
export function equipmentFor(careerId: string): Accessory[] {
  return ACCESSORIES.filter((a) => a.careers?.includes(careerId))
}

/** How many work things a bag (or tool belt) has room for. */
export function capacityOf(a: Accessory): number {
  if (a.uses?.includes('carry-6')) return 6
  if (a.uses?.includes('carry-4')) return 4
  if (a.uses?.includes('carry-2')) return 2
  return 0
}
