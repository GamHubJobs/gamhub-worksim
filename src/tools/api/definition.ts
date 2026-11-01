/** API Client: its registration with the tools framework, and the API's sample data. */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { checkResult } from '../checks'
import type { ToolDefinition } from '../types'
import { ApiStateSchema, METHODS, type ApiState } from './schema'
import { BASE_URL } from './server'

export const READ_TOKEN = 'crk_read_7f3a91c2'
export const WRITE_TOKEN = 'crk_write_92bd04e8'

export function timesheetApi(): ApiState {
  return {
    environment: [
      { name: 'baseUrl', value: BASE_URL },
      { name: 'readToken', value: READ_TOKEN },
      { name: 'writeToken', value: WRITE_TOKEN },
    ],
    server: {
      tokens: [
        { token: READ_TOKEN, scope: 'read', owner: 'reporting' },
        { token: WRITE_TOKEN, scope: 'write', owner: 'timesheet app' },
      ],
      projects: [
        {
          code: 'PRJ-1042',
          name: 'Harbour Foods process review',
          client: 'Harbour Foods',
        },
        { code: 'PRJ-2001', name: 'Northgate fleet costs', client: 'Northgate Motors' },
        { code: 'PRJ-2210', name: 'Brightpath training', client: 'Brightpath Clinics' },
      ],
      entries: [
        {
          id: 1,
          person: 'maya.patel',
          project: 'PRJ-1042',
          date: '2026-03-02',
          hours: 7.5,
          description: 'Process mapping workshop',
        },
        {
          id: 2,
          person: 'owen.clarke',
          project: 'PRJ-2001',
          date: '2026-03-02',
          hours: 6,
          description: 'Fleet data analysis',
        },
        {
          id: 3,
          person: 'maya.patel',
          project: 'PRJ-2210',
          date: '2026-03-03',
          hours: 3.25,
          description: 'Training preparation',
        },
      ],
      nextId: 4,
    },
    history: [],
    collection: [],
    report: '',
  }
}

export const ApiCheckSchema = z.discriminatedUnion('type', [
  /** Requests were sent that got these responses. */
  FileCheckBaseSchema.extend({
    type: z.literal('requests'),
    items: z
      .array(
        z.object({
          description: z.string(),
          method: z.enum(METHODS),
          /** A regular expression the path (after the base URL) must match. */
          path: z.string(),
          status: z.number().int(),
        }),
      )
      .min(1),
  }),
  /** The API holds an entry like this (created by the player). */
  FileCheckBaseSchema.extend({
    type: z.literal('entry'),
    person: z.string(),
    date: z.string(),
    hours: z.number(),
  }),
  /** At least this many requests saved in the collection. */
  FileCheckBaseSchema.extend({
    type: z.literal('collection'),
    min: z.number().int().positive(),
  }),
  /** The bug report mentions each group of words (any word of a group counts). */
  FileCheckBaseSchema.extend({
    type: z.literal('report'),
    terms: z.array(z.array(z.string()).min(1)).min(1),
    minWords: z.number().int().min(0).default(30),
  }),
])
export type ApiCheck = z.infer<typeof ApiCheckSchema>

function gradeCheck(check: ApiCheck, player: ApiState) {
  switch (check.type) {
    case 'requests': {
      const missing = check.items.filter((item) => {
        const pattern = new RegExp(item.path)
        return !player.history.some((h) => {
          const path = h.sentUrl.startsWith(BASE_URL)
            ? h.sentUrl.slice(BASE_URL.length).split('?')[0]
            : ''
          return (
            h.method === item.method && h.status === item.status && pattern.test(path)
          )
        })
      })
      return checkResult(
        check,
        1 - missing.length / check.items.length,
        missing.map(
          (m) => `No request ${m.description} (${m.method}, answered ${m.status}).`,
        ),
      )
    }
    case 'entry': {
      const found = player.server.entries.some(
        (e) =>
          e.person === check.person &&
          e.date === check.date &&
          Math.abs(e.hours - check.hours) < 0.001,
      )
      return checkResult(
        check,
        found ? 1 : 0,
        found
          ? []
          : [
              `The API has no entry for ${check.person} on ${check.date} with ${check.hours} hours.`,
            ],
      )
    }
    case 'collection':
      return checkResult(
        check,
        Math.min(1, player.collection.length / check.min),
        player.collection.length >= check.min
          ? []
          : [
              `Save at least ${check.min} requests in the collection (you have ${player.collection.length}).`,
            ],
      )
    case 'report': {
      const text = player.report.toLowerCase()
      const missing = check.terms.filter(
        (group) => !group.some((t) => text.includes(t.toLowerCase())),
      )
      const words = player.report.trim().split(/\s+/).filter(Boolean).length
      const problems = [
        ...missing.map((g) => `The bug report doesn’t mention “${g[0]}”.`),
        ...(words < check.minWords
          ? [
              `The bug report is only ${words} words: say how to reproduce it, what happened and what should happen.`,
            ]
          : []),
      ]
      const parts = check.terms.length + 1
      return checkResult(
        check,
        (check.terms.length - missing.length + (words >= check.minWords ? 1 : 0)) / parts,
        problems,
      )
    }
  }
}

export const apiClient: ToolDefinition<ApiState, ApiCheck> = {
  id: 'api',
  name: 'API Client',
  category: 'API testing',
  icon: 'api',
  sections: [
    {
      id: 'request',
      name: 'Request',
      description: 'Build and send HTTP requests; read the response.',
    },
    {
      id: 'docs',
      name: 'API reference',
      description: 'The timesheet API’s endpoints and rules.',
    },
    {
      id: 'environment',
      name: 'Environment',
      description: 'Variables such as {{baseUrl}} and the tokens.',
    },
    {
      id: 'report',
      name: 'Bug report',
      description: 'Report what you found to the developers.',
    },
  ],
  state: ApiStateSchema,
  practice: () => timesheetApi(),
  summary: (state) =>
    `${state.history.length} request${state.history.length === 1 ? '' : 's'} sent, ${state.collection.length} saved`,
  check: ApiCheckSchema,
  grade: (checks, player) =>
    checks.map((check) =>
      player
        ? gradeCheck(check, player)
        : checkResult(check, 0, ['The API Client file was not handed in.']),
    ),
  guide: {
    intro:
      'API Client sends HTTP requests to the company’s timesheet API and shows exactly what comes back. Developers and testers use tools like this to try an API before anyone builds on it: does it accept good data, refuse bad data, and protect itself from people who shouldn’t use it?',
    topics: [
      {
        title: 'Send a request',
        body: 'Choose the method (GET reads, POST creates, PATCH changes, DELETE removes), type the address, e.g. {{baseUrl}}/v1/projects, add headers such as Authorization: Bearer {{readToken}}, and for POST and PATCH a JSON body. Click Send and read the status code and the response.',
      },
      {
        title: 'Status codes',
        body: '2xx means it worked (200 OK, 201 Created, 204 No Content). 4xx means the request was wrong: 400 bad request, 401 not signed in, 403 not allowed, 404 not found, 422 the data broke a rule. A good API answers every mistake with the right code and a helpful message.',
      },
      {
        title: 'Test like a tester',
        body: 'Check the happy path (valid data works), the sad paths (bad data, a missing or wrong token), and every method on an endpoint. When something behaves differently from the reference, write it up: how to reproduce it, what happened, and what should have happened.',
      },
    ],
    glossary: [
      { term: 'API', meaning: 'A way for programs to talk to each other over the web.' },
      { term: 'Endpoint', meaning: 'An address the API answers, e.g. /v1/timesheets.' },
      { term: 'Method', meaning: 'What to do: GET, POST, PATCH or DELETE.' },
      {
        term: 'Status code',
        meaning: 'The three-digit result of a request, e.g. 201 Created.',
      },
      {
        term: 'Bearer token',
        meaning: 'A secret sent in the Authorization header to prove who you are.',
      },
      { term: 'JSON', meaning: 'The text format for data in requests and responses.' },
      {
        term: 'Environment variable',
        meaning: 'A named value such as {{baseUrl}}, filled in when sending.',
      },
    ],
  },
}
