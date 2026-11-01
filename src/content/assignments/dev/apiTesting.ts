import type { AssignmentInput } from '../../schemas'
import { timesheetApi } from '../../../tools/api/definition'
import type { ApiRequest, ApiState } from '../../../tools/api/schema'
import { send } from '../../../tools/api/server'

/**
 * Software Development (Software Developer): test the timesheet API before
 * the mobile app uses it. Happy and sad paths, authentication and
 * permissions, a saved collection, and a bug report for the bug that is
 * really there (PATCH doesn't validate hours).
 */
const start = timesheetApi()

const auth = (token: string) => [{ key: 'Authorization', value: `Bearer {{${token}}}` }]
const json = (value: unknown) => JSON.stringify(value, null, 2)
const entry = {
  person: 'ines.duarte',
  project: 'PRJ-2210',
  date: '2026-03-04',
  hours: 7.5,
  description: 'Workshop materials',
}

const plan: Array<[string, ApiRequest]> = [
  [
    'List projects',
    {
      method: 'GET',
      url: '{{baseUrl}}/v1/projects',
      headers: auth('readToken'),
      body: '',
    },
  ],
  [
    'No token',
    { method: 'GET', url: '{{baseUrl}}/v1/timesheets', headers: [], body: '' },
  ],
  [
    'Create entry',
    {
      method: 'POST',
      url: '{{baseUrl}}/v1/timesheets',
      headers: auth('writeToken'),
      body: json(entry),
    },
  ],
  [
    'Invalid entry',
    {
      method: 'POST',
      url: '{{baseUrl}}/v1/timesheets',
      headers: auth('writeToken'),
      body: json({ ...entry, hours: 14 }),
    },
  ],
  [
    'Read token cannot write',
    {
      method: 'POST',
      url: '{{baseUrl}}/v1/timesheets',
      headers: auth('readToken'),
      body: json(entry),
    },
  ],
  [
    'PATCH hours too high',
    {
      method: 'PATCH',
      url: '{{baseUrl}}/v1/timesheets/1',
      headers: auth('writeToken'),
      body: json({ hours: 20 }),
    },
  ],
]

function solution(): ApiState {
  let s = start
  for (const [, request] of plan) s = send(s, request)
  return {
    ...s,
    collection: plan.map(([name, request]) => ({ ...request, name })),
    report:
      'PATCH /v1/timesheets/1 with the body {"hours": 20} returns 200 and saves 20 hours. The reference says the same rules as POST apply, so it should return 422 with "hours must be more than 0 and no more than 12". POST correctly refuses 14 hours with 422. Steps: send PATCH {{baseUrl}}/v1/timesheets/1 with a write token and that body, then GET the entry: it now has 20 hours.',
  }
}

export const apiTesting: AssignmentInput = {
  id: 'api-testing',
  version: 1,
  careerId: 'software-development',
  levelId: 'software-developer',
  order: 6,
  kind: 'tool',
  title: 'Test the timesheet API',
  summary:
    'Check the API before the mobile app depends on it: what works, what is refused, and what is broken.',
  estimatedMinutes: 45,
  from: 'manager',
  briefing: {
    subject: 'Please test the timesheet API before the mobile app ships',
    body: `Hi {name},

The new mobile app will use our **timesheet API**. Before it does, I want it tested properly in **API Client**. The tokens and the address are in the Environment; the rules are in the API reference.

Please check, and **save each request in the collection** (at least five):
1. listing the projects with the read token works,
2. a request **without a token** is refused,
3. creating a valid entry works: log **ines.duarte**, **PRJ-2210**, **2026-03-04**, **7.5** hours, “Workshop materials”,
4. an invalid entry (e.g. 14 hours) is refused with the right code,
5. the **read** token can’t create entries,
6. and the other methods follow the same rules. {senior} suspects one of them doesn’t.

Write up anything that doesn’t match the reference in **Bug report**.

Samuel`,
  },
  whyItMatters:
    'APIs are the contracts between systems: an API that accepts bad data or lets the wrong people change things breaks everything built on it. Testing the happy path, the sad paths and the security rules, and reporting bugs clearly, is everyday work for developers and testers.',
  objectives: [
    'Send authenticated requests and read status codes',
    'Test valid data, invalid data and permissions',
    'Find a real bug and report it so it can be reproduced',
  ],
  steps: [
    {
      id: 'read',
      title: 'Read the reference',
      instructions:
        'Open **API reference** and **Environment**. Note the tokens and the rules for an entry.',
    },
    {
      id: 'happy',
      title: 'The happy path',
      instructions:
        'In **Request**, send GET `{{baseUrl}}/v1/projects` with the header `Authorization: Bearer {{readToken}}`. Then POST the new entry to `{{baseUrl}}/v1/timesheets` with the write token and a JSON body. Save each request.',
    },
    {
      id: 'sad',
      title: 'The sad paths',
      instructions:
        'Remove the Authorization header and send again (expect 401). POST 14 hours (expect 422). POST with the read token (expect 403). Save them.',
    },
    {
      id: 'bug',
      title: 'Hunt the bug',
      instructions:
        'Try the other methods with bad data, e.g. PATCH `{{baseUrl}}/v1/timesheets/1` with `{"hours": 20}`. What should happen according to the reference, and what does?',
      hint: 'PATCH must follow the same rules as POST.',
    },
    {
      id: 'report',
      title: 'Report it and hand in',
      instructions:
        'In **Bug report**, write how to reproduce it, what happened and what should happen. Then **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'api',
    title: 'API Client: timesheet API',
    start,
    solution: solution(),
    checks: [
      {
        id: 'happy',
        type: 'requests',
        items: [
          {
            description: 'listing the projects',
            method: 'GET',
            path: '^/v1/projects$',
            status: 200,
          },
          {
            description: 'creating a valid entry',
            method: 'POST',
            path: '^/v1/timesheets$',
            status: 201,
          },
        ],
        title: 'The happy path works',
        points: 15,
        why: 'First prove that correct use works.',
        hint: 'GET /v1/projects with the read token; POST a valid entry with the write token.',
      },
      {
        id: 'entry',
        type: 'entry',
        person: 'ines.duarte',
        date: '2026-03-04',
        hours: 7.5,
        title: 'Ines’s hours logged',
        points: 10,
        why: 'The created entry is there for the mobile app to read.',
        hint: 'POST ines.duarte, PRJ-2210, 2026-03-04, 7.5 hours, with a description.',
      },
      {
        id: 'sad',
        type: 'requests',
        items: [
          { description: 'without a token', method: 'GET', path: '.*', status: 401 },
          {
            description: 'with invalid data',
            method: 'POST',
            path: '^/v1/timesheets$',
            status: 422,
          },
          {
            description: 'writing with the read token',
            method: 'POST',
            path: '^/v1/timesheets$',
            status: 403,
          },
        ],
        title: 'Bad requests are refused',
        points: 25,
        why: 'Most bugs, and every security hole, are on the sad paths.',
        hint: 'No Authorization header; 14 hours; the read token on POST.',
      },
      {
        id: 'found',
        type: 'requests',
        items: [
          {
            description: 'that shows PATCH accepting bad hours',
            method: 'PATCH',
            path: '^/v1/timesheets/\\d+$',
            status: 200,
          },
        ],
        title: 'The bug reproduced',
        points: 15,
        why: 'A bug you can reproduce is a bug that gets fixed.',
        hint: 'PATCH an entry with hours that POST would refuse.',
      },
      {
        id: 'collection',
        type: 'collection',
        min: 5,
        title: 'Requests saved for next time',
        points: 10,
        why: 'A saved collection lets anyone rerun the tests after every change.',
        hint: 'Save each request in the collection.',
      },
      {
        id: 'report',
        type: 'report',
        terms: [['PATCH'], ['hours'], ['422', 'should', 'refuse', 'reject']],
        minWords: 30,
        title: 'A bug report that can be acted on',
        points: 25,
        why: 'Developers fix what they can reproduce: the request, what happened, and what should have happened.',
        hint: 'Name the method and endpoint, the body you sent, the 200 you got, and the 422 you expected.',
      },
    ],
  },
  passScore: 70,
  xp: 150,
  skills: {
    'software-testing': 45,
    debugging: 25,
    'technical-writing': 20,
    programming: 10,
  },
  feedback: {
    excellent: `Hi {name},

Thorough testing, and a bug report {senior} could fix in ten minutes: PATCH skipped the hours check. The mobile app would have let people log 20-hour days. Good catch.

Samuel`,
    good: `Hi {name},

Good testing; something is missing. See the notes.

Samuel`,
    pass: `Hi {name},

Some cases weren’t tested, or the bug report needs more. The notes explain.

Samuel`,
    fail: `Hi {name},

Start with GET /v1/projects and the read token, then work through the list.

Samuel`,
  },
}
