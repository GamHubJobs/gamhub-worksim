/**
 * Countries and regions, for "where is this job open to?". Remote adverts say
 * who may apply in their own words ("USA, Canada", "EMEA", "Worldwide",
 * "Europe timezones"); this reads those words into countries and regions, so
 * a player in any country can find what is open to them.
 */

export type Region =
  | 'africa'
  | 'europe'
  | 'middle-east'
  | 'asia'
  | 'north-america'
  | 'latin-america'
  | 'oceania'

/** Every country (ISO 3166-1 alpha-2), by region. */
const BY_REGION: Record<Region, string> = {
  africa:
    'DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW',
  europe:
    'AL AD AT BY BE BA BG HR CY CZ DK EE FI FR DE GR HU IS IE IT XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA',
  'middle-east': 'AE BH IL IQ IR JO KW LB OM PS QA SA SY TR YE',
  asia: 'AF AM AZ BD BT BN KH CN GE HK IN ID JP KZ KG LA MO MY MV MN MM NP KP PK PH SG KR LK TW TJ TH TL TM UZ VN',
  'north-america': 'US CA',
  'latin-america':
    'MX GT BZ SV HN NI CR PA CU DO HT JM TT BS BB AR BO BR CL CO EC GY PY PE SR UY VE PR',
  oceania: 'AU NZ FJ PG WS TO VU SB KI FM MH NR PW TV',
}

const REGION_OF = new Map<string, Region>()
for (const [region, codes] of Object.entries(BY_REGION) as Array<[Region, string]>)
  for (const code of codes.split(' ')) REGION_OF.set(code, region)

export const COUNTRY_CODES: string[] = [...REGION_OF.keys()]

export function regionOf(code: string): Region | undefined {
  return REGION_OF.get(code.toUpperCase())
}

let names: Intl.DisplayNames | null | undefined
/** A country's name in English ("GM" → "Gambia"). */
export function countryName(code: string): string {
  if (names === undefined) {
    try {
      names = new Intl.DisplayNames(['en'], { type: 'region' })
    } catch {
      names = null
    }
  }
  try {
    return names?.of(code.toUpperCase()) ?? code.toUpperCase()
  } catch {
    return code.toUpperCase()
  }
}

/** The countries in a list, sorted by name (for choosing one). */
export function countryList(): Array<{ code: string; name: string }> {
  return COUNTRY_CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
}

/** Groups adverts use, as the regions they cover. */
const GROUPS: Record<string, Region[]> = {
  emea: ['europe', 'middle-east', 'africa'],
  apac: ['asia', 'oceania'],
  'asia pacific': ['asia', 'oceania'],
  'asia-pacific': ['asia', 'oceania'],
  latam: ['latin-america'],
  'latin america': ['latin-america'],
  'south america': ['latin-america'],
  'central america': ['latin-america'],
  caribbean: ['latin-america'],
  americas: ['north-america', 'latin-america'],
  'north america': ['north-america'],
  europe: ['europe'],
  eu: ['europe'],
  eea: ['europe'],
  'european union': ['europe'],
  africa: ['africa'],
  'sub-saharan africa': ['africa'],
  'west africa': ['africa'],
  'east africa': ['africa'],
  'middle east': ['middle-east'],
  mena: ['middle-east', 'africa'],
  asia: ['asia'],
  'south asia': ['asia'],
  'southeast asia': ['asia'],
  oceania: ['oceania'],
}

const WORLDWIDE =
  /\b(worldwide|anywhere|global(ly)?|remote[- ]?first|all countries|any location|international)\b/i

/** Other names adverts use for countries. */
const ALIASES: Record<string, string> = {
  usa: 'US',
  us: 'US',
  'u.s.': 'US',
  'u.s.a.': 'US',
  america: 'US',
  'united states of america': 'US',
  uk: 'GB',
  'u.k.': 'GB',
  britain: 'GB',
  'great britain': 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  'northern ireland': 'GB',
  uae: 'AE',
  deutschland: 'DE',
  türkiye: 'TR',
  turkiye: 'TR',
  turkey: 'TR',
  czechia: 'CZ',
  'czech republic': 'CZ',
  'south korea': 'KR',
  korea: 'KR',
  'the gambia': 'GM',
  gambia: 'GM',
  "côte d'ivoire": 'CI',
  'ivory coast': 'CI',
  holland: 'NL',
  'the netherlands': 'NL',
  'hong kong': 'HK',
  russia: 'RU',
  vietnam: 'VN',
  'viet nam': 'VN',
  österreich: 'AT',
  schweiz: 'CH',
}

let byName: Map<string, string> | null = null
function nameIndex(): Map<string, string> {
  if (byName) return byName
  byName = new Map(Object.entries(ALIASES))
  for (const code of COUNTRY_CODES) byName.set(countryName(code).toLowerCase(), code)
  return byName
}

/** German cities and states, for the German feed's on-site adverts ("Berlin", "München"). */
const GERMAN_PLACES =
  /\b(berlin|hamburg|m[üu]nchen|munich|k[öo]ln|cologne|frankfurt|stuttgart|d[üu]sseldorf|dortmund|essen|leipzig|bremen|dresden|hannover|n[üu]rnberg|nuremberg|bonn|mannheim|karlsruhe|augsburg|wiesbaden|m[üu]nster|aachen|kiel|freiburg|heidelberg|potsdam|bayern|bavaria|hessen|sachsen|baden-w[üu]rttemberg|nordrhein-westfalen|niedersachsen)\b/i

export interface Where {
  countries: string[]
  regions: Region[]
  worldwide: boolean
}

/** Reads where an advert is open to from its own words. */
export function readWhere(text: string, hint?: { country?: string }): Where {
  const t = text.toLowerCase().trim()
  const countries = new Set<string>()
  const regions = new Set<Region>()
  const worldwide = WORLDWIDE.test(t)
  const index = nameIndex()
  // Pieces: "USA, Canada", "Europe / Africa", "UK or Ireland", "USA timezones".
  for (const raw of t.split(/[,;/|()]|\bor\b|\band\b|&/)) {
    const piece = raw
      .replace(
        /\b(time ?zones?|timezone|only|based|residents?|remote|preferred|hybrid|on-?site)\b/g,
        '',
      )
      .replace(/\s+/g, ' ')
      .trim()
    if (!piece) continue
    if (GROUPS[piece]) GROUPS[piece].forEach((r) => regions.add(r))
    const code = index.get(piece)
    if (code) countries.add(code)
    else if (/^[a-z]{2}$/.test(piece) && REGION_OF.has(piece.toUpperCase()))
      countries.add(piece.toUpperCase())
    else
      for (const [pattern, c] of namePatterns()) if (pattern.test(piece)) countries.add(c)
  }
  if (
    hint?.country &&
    countries.size === 0 &&
    GERMAN_PLACES.test(t) &&
    hint.country === 'DE'
  )
    countries.add('DE')
  return { countries: [...countries], regions: [...regions], worldwide }
}

let patterns: Array<[RegExp, string]> | null = null
/** Country names inside longer words ("remote - germany"), compiled once. */
function namePatterns(): Array<[RegExp, string]> {
  patterns ??= [...nameIndex()]
    .filter(([name]) => name.length > 3)
    .map(([name, code]): [RegExp, string] => [
      new RegExp(`(^|[^\\p{L}])${escape(name)}($|[^\\p{L}])`, 'u'),
      code,
    ])
  return patterns
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Whether someone living in `code` may apply: worldwide, their country named,
 * or their region (or a group with it, like EMEA). An advert that says nothing
 * about where is not counted as open to everyone.
 */
export function openTo(
  where: { countries: readonly string[]; regions: readonly string[]; worldwide: boolean },
  code: string,
): boolean {
  if (!code) return true
  const c = code.toUpperCase()
  if (where.worldwide) return true
  if (where.countries.includes(c)) return true
  const region = regionOf(c)
  return !!region && where.regions.includes(region)
}

/** Jobicy's location filter (its own list of places, `get=locations`). */
const JOBICY_GEO: Record<string, string> = {
  AR: 'argentina',
  AU: 'australia',
  AT: 'austria',
  BE: 'belgium',
  BR: 'brazil',
  BG: 'bulgaria',
  CA: 'canada',
  CN: 'china',
  CR: 'costa-rica',
  HR: 'croatia',
  CY: 'cyprus',
  CZ: 'czechia',
  DK: 'denmark',
  EE: 'estonia',
  FI: 'finland',
  FR: 'france',
  DE: 'germany',
  GR: 'greece',
  HK: 'hong-kong',
  HU: 'hungary',
  IE: 'ireland',
  IL: 'israel',
  IT: 'italy',
  JP: 'japan',
  LV: 'latvia',
  LT: 'lithuania',
  MY: 'malaysia',
  MX: 'mexico',
  NL: 'netherlands',
  NZ: 'new-zealand',
  NO: 'norway',
  PH: 'philippines',
  PL: 'poland',
  PT: 'portugal',
  RO: 'romania',
  RS: 'serbia',
  SG: 'singapore',
  SK: 'slovakia',
  SI: 'slovenia',
  KR: 'south-korea',
  ES: 'spain',
  SE: 'sweden',
  CH: 'switzerland',
  TH: 'thailand',
  TR: 'turkiye',
  AE: 'united-arab-emirates',
  GB: 'uk',
  UA: 'ukraine',
  US: 'usa',
  VN: 'vietnam',
}

/**
 * The Jobicy location to ask for, for someone in `code`: their country where
 * Jobicy lists it, else their part of the world (EMEA, APAC, LATAM).
 */
export function jobicyGeo(code: string): string | undefined {
  if (!code) return undefined
  const c = code.toUpperCase()
  if (JOBICY_GEO[c]) return JOBICY_GEO[c]
  const region = regionOf(c)
  if (region === 'africa' || region === 'middle-east') return 'emea'
  if (region === 'europe') return 'europe'
  if (region === 'asia' || region === 'oceania') return 'apac'
  if (region === 'latin-america') return 'latam'
  return undefined
}

/** A first guess at the player's country, from the browser's language ("en-GB" → GB). */
export function guessCountry(
  languages: readonly string[] = globalThis.navigator?.languages ?? [],
): string {
  for (const tag of languages) {
    const region = tag.split('-')[1]?.toUpperCase()
    if (region && REGION_OF.has(region)) return region
  }
  return ''
}
