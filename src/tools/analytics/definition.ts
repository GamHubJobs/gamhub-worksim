/** Site Analytics: its registration with the tools framework. */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { checkResult } from '../checks'
import type { ToolDefinition } from '../types'
import { springTraffic } from './data'
import { DIMENSION_NAMES } from './model'
import { AnalyticsStateSchema, DIMENSIONS, type AnalyticsState } from './schema'

export const AnalyticsCheckSchema = z.discriminatedUnion('type', [
  /** The task's questions are answered correctly. */
  FileCheckBaseSchema.extend({
    type: z.literal('answers'),
    items: z
      .array(
        z.object({
          id: z.string(),
          /** The right answer: a number (with a tolerance) or an option. */
          value: z.union([z.number(), z.string()]),
          tolerance: z.number().min(0).default(0),
        }),
      )
      .min(1),
  }),
  /** A report by this dimension (with these filters) has been saved. */
  FileCheckBaseSchema.extend({
    type: z.literal('report'),
    dimension: z.enum(DIMENSIONS),
    filters: z
      .object({ source: z.string().optional(), device: z.string().optional() })
      .default({}),
  }),
])
export type AnalyticsCheck = z.infer<typeof AnalyticsCheckSchema>

function gradeCheck(check: AnalyticsCheck, player: AnalyticsState) {
  switch (check.type) {
    case 'answers': {
      const wrong = check.items.flatMap((item) => {
        const question = player.questions.find((q) => q.id === item.id)
        const given = question?.answer.trim() ?? ''
        const ok =
          typeof item.value === 'number'
            ? given !== '' &&
              Math.abs(Number(given.replace(/[%,£\s]/g, '')) - item.value) <=
                item.tolerance
            : given.toLowerCase() === item.value.toLowerCase()
        return ok
          ? []
          : [
              `“${question?.question ?? item.id}”: ${given ? `${given} is not right` : 'not answered'}.`,
            ]
      })
      return checkResult(check, 1 - wrong.length / check.items.length, wrong)
    }
    case 'report': {
      const found = player.reports.some(
        (r) =>
          r.dimension === check.dimension &&
          (check.filters.source ?? '') === (r.filters.source ?? '') &&
          (check.filters.device ?? '') === (r.filters.device ?? ''),
      )
      const filters = Object.values(check.filters).filter(Boolean)
      return checkResult(
        check,
        found ? 1 : 0,
        found
          ? []
          : [
              `No saved report by ${DIMENSION_NAMES[check.dimension].toLowerCase()}${filters.length ? ` filtered to ${filters.join(', ')}` : ''}.`,
            ],
      )
    }
  }
}

export const analytics: ToolDefinition<AnalyticsState, AnalyticsCheck> = {
  id: 'analytics',
  name: 'Site Analytics',
  category: 'Website analytics',
  icon: 'analytics',
  sections: [
    {
      id: 'explore',
      name: 'Explore',
      description: 'Break traffic down by source, device or landing page, with filters.',
    },
    {
      id: 'funnel',
      name: 'Booking funnel',
      description: 'Where visitors drop out between arriving and booking.',
    },
    {
      id: 'reports',
      name: 'Saved reports',
      description: 'Views you saved to share or come back to.',
    },
    {
      id: 'questions',
      name: 'Questions',
      description: 'What your manager wants to know, and your answers.',
    },
  ],
  state: AnalyticsStateSchema,
  practice: () => springTraffic(),
  summary: (state) =>
    `${state.reports.length} saved report${state.reports.length === 1 ? '' : 's'}${state.questions.length ? `, ${state.questions.filter((q) => q.answer).length} of ${state.questions.length} answered` : ''}`,
  check: AnalyticsCheckSchema,
  grade: (checks, player) =>
    checks.map((check) =>
      player
        ? gradeCheck(check, player)
        : checkResult(check, 0, ['The analytics file was not handed in.']),
    ),
  guide: {
    intro:
      'Site Analytics shows how people arrive at the website and what they do there. Marketers use it to find where money and effort are wasted: traffic that doesn’t engage, pages that don’t lead anywhere, steps where visitors give up.',
    topics: [
      {
        title: 'Explore by a dimension',
        body: 'Choose a dimension (traffic source, device or landing page) to get one row per value, with sessions, engagement rate, the funnel steps and the conversion rate. Add filters to look inside one group, e.g. only mobile, or only paid social.',
      },
      {
        title: 'Read the funnel',
        body: 'The booking funnel follows visitors from arriving, to viewing pricing, to starting the booking form, to booking. The drop between two steps shows where people give up. Compare devices: if one step is much worse on one device, something is probably broken there.',
      },
      {
        title: 'Rates from totals',
        body: 'Work out rates from totals (bookings ÷ form starts for the whole group), not by averaging rates of smaller groups. Check how many sessions a rate is based on: a rate from a handful of visits proves little.',
      },
    ],
    glossary: [
      { term: 'Session', meaning: 'One visit to the website.' },
      {
        term: 'Engagement rate',
        meaning:
          'Share of sessions where the visitor did something: stayed, scrolled or clicked.',
      },
      {
        term: 'Funnel',
        meaning: 'The steps towards a goal, and how many people reach each one.',
      },
      { term: 'Conversion rate', meaning: 'Bookings ÷ sessions.' },
      { term: 'Form completion', meaning: 'Bookings ÷ booking forms started.' },
      { term: 'Landing page', meaning: 'The first page a visitor sees.' },
    ],
  },
}
