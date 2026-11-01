/**
 * Two weeks of the company website's traffic during the spring campaign.
 * Built from typical rates per source, device and landing page, so the
 * numbers are consistent, and with one real problem hidden in them: the
 * booking form barely works on phones.
 */
import type { AnalyticsState, TrafficRow } from './schema'

const SOURCES: Record<
  string,
  {
    sessions: number
    engagement: number
    mobileShare: number
    landing: Record<string, number>
  }
> = {
  'Organic search': {
    sessions: 4200,
    engagement: 1,
    mobileShare: 0.48,
    landing: {
      '/blog/month-end-checklist': 0.45,
      '/': 0.25,
      '/services/advisory': 0.2,
      '/spring-offer': 0.1,
    },
  },
  'Paid search': {
    sessions: 2600,
    engagement: 1.05,
    mobileShare: 0.5,
    landing: { '/spring-offer': 0.6, '/services/advisory': 0.3, '/': 0.1 },
  },
  'Paid social': {
    sessions: 1900,
    engagement: 0.6,
    mobileShare: 0.8,
    landing: { '/spring-offer': 0.85, '/': 0.15 },
  },
  Email: {
    sessions: 900,
    engagement: 1.2,
    mobileShare: 0.55,
    landing: { '/spring-offer': 0.9, '/': 0.1 },
  },
  Direct: {
    sessions: 1500,
    engagement: 1.1,
    mobileShare: 0.4,
    landing: { '/': 0.7, '/services/advisory': 0.2, '/spring-offer': 0.1 },
  },
  Referral: {
    sessions: 400,
    engagement: 1,
    mobileShare: 0.4,
    landing: { '/': 0.5, '/blog/month-end-checklist': 0.3, '/services/advisory': 0.2 },
  },
}

const DEVICES = {
  desktop: { engaged: 0.62, pricing: 1, form: 0.3, booking: 0.38 },
  mobile: { engaged: 0.48, pricing: 0.9, form: 0.28, booking: 0.04 },
  tablet: { engaged: 0.55, pricing: 1, form: 0.3, booking: 0.3 },
}

const PRICING_RATE: Record<string, number> = {
  '/spring-offer': 0.45,
  '/': 0.25,
  '/services/advisory': 0.35,
  '/blog/month-end-checklist': 0.08,
}

type Sources = typeof SOURCES
type Devices = typeof DEVICES

function trafficRows(
  sources: Sources,
  devices: Devices,
  pricingRate: Record<string, number>,
): TrafficRow[] {
  const rows: TrafficRow[] = []
  for (const [source, s] of Object.entries(sources)) {
    const tabletShare = 0.07
    const shares = {
      desktop: 1 - s.mobileShare - tabletShare,
      mobile: s.mobileShare,
      tablet: tabletShare,
    }
    for (const [device, d] of Object.entries(devices)) {
      for (const [landing, landingShare] of Object.entries(s.landing)) {
        const sessions = Math.round(
          s.sessions * shares[device as keyof typeof shares] * landingShare,
        )
        const engaged = Math.round(sessions * Math.min(0.92, d.engaged * s.engagement))
        const pricing = Math.round(engaged * pricingRate[landing] * d.pricing * 1.4)
        const formStarts = Math.round(pricing * d.form)
        const bookings = Math.round(formStarts * d.booking)
        rows.push({
          source,
          device,
          landing,
          sessions,
          engaged,
          pricing,
          formStarts,
          bookings,
        })
      }
    }
  }
  return rows
}

export function springTraffic(): AnalyticsState {
  return {
    site: 'cobaltridge.example',
    period: '6 to 19 April 2026 (spring campaign)',
    rows: trafficRows(SOURCES, DEVICES, PRICING_RATE),
    reports: [],
    questions: [],
  }
}

/**
 * The first two weeks after launching the Cash-flow Health Check. Visitors
 * arrive, but the launch page's "See prices" button is broken (few reach
 * pricing from it), and paid social brings many visits that do nothing.
 */
export function launchTraffic(): AnalyticsState {
  const sources: Sources = {
    'Organic search': {
      sessions: 3100,
      engagement: 1,
      mobileShare: 0.45,
      landing: { '/health-check': 0.3, '/': 0.4, '/services/advisory': 0.3 },
    },
    'Paid search': {
      sessions: 2800,
      engagement: 1.05,
      mobileShare: 0.45,
      landing: { '/health-check': 0.75, '/services/advisory': 0.25 },
    },
    'Paid social': {
      sessions: 3600,
      engagement: 0.45,
      mobileShare: 0.8,
      landing: { '/health-check': 0.9, '/': 0.1 },
    },
    Email: {
      sessions: 1100,
      engagement: 1.2,
      mobileShare: 0.5,
      landing: { '/health-check': 0.85, '/': 0.15 },
    },
    Direct: {
      sessions: 1400,
      engagement: 1.1,
      mobileShare: 0.4,
      landing: { '/': 0.7, '/services/advisory': 0.2, '/health-check': 0.1 },
    },
    Referral: {
      sessions: 500,
      engagement: 1,
      mobileShare: 0.4,
      landing: { '/': 0.5, '/services/advisory': 0.5 },
    },
  }
  const devices: Devices = {
    desktop: { engaged: 0.62, pricing: 1, form: 0.3, booking: 0.38 },
    mobile: { engaged: 0.5, pricing: 0.95, form: 0.3, booking: 0.32 },
    tablet: { engaged: 0.55, pricing: 1, form: 0.3, booking: 0.32 },
  }
  return {
    site: 'cobaltridge.example',
    period: '1 to 14 June 2026 (Health Check launch)',
    rows: trafficRows(sources, devices, {
      '/health-check': 0.04,
      '/': 0.25,
      '/services/advisory': 0.35,
    }),
    reports: [],
    questions: [],
  }
}
