/**
 * The simulated timesheet API: routing, authentication, validation and data,
 * as a pure function from (data, request) to (data, response). It has one
 * deliberate bug for testers to find: PATCH does not validate hours.
 */
import type { ApiRequest, ApiState, Entry } from './schema'

export const BASE_URL = 'https://api.cobaltridge.example'

export interface ApiResponse {
  status: number
  body: unknown
}

export const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  422: 'Unprocessable Entity',
}

/** Replaces {{name}} with the environment's values. */
export function substitute(state: ApiState, text: string): string {
  return text.replace(
    /\{\{\s*(\w+)\s*\}\}/g,
    (all, name: string) => state.environment.find((v) => v.name === name)?.value ?? all,
  )
}

function validate(state: ApiState, entry: Partial<Entry>): string[] {
  const errors: string[] = []
  if (typeof entry.person !== 'string' || entry.person.trim() === '')
    errors.push('person is required')
  if (typeof entry.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date))
    errors.push('date must be YYYY-MM-DD')
  if (!state.server.projects.some((p) => p.code === entry.project))
    errors.push('project must be an existing project code')
  if (typeof entry.hours !== 'number' || !(entry.hours > 0 && entry.hours <= 12)) {
    errors.push('hours must be more than 0 and no more than 12')
  } else if (!Number.isInteger(entry.hours * 4))
    errors.push('hours must be in quarter hours')
  if (typeof entry.description !== 'string' || entry.description.trim().length < 5) {
    errors.push('description must be at least 5 characters')
  }
  return errors
}

export function handle(
  state: ApiState,
  request: ApiRequest,
): { state: ApiState; response: ApiResponse } {
  const reply = (status: number, body: unknown, next = state) => ({
    state: next,
    response: { status, body },
  })
  const url = substitute(state, request.url).trim()
  if (!url.startsWith(BASE_URL)) {
    return reply(400, {
      error: `This client can only reach ${BASE_URL}. Check the address (or the {{baseUrl}} variable).`,
    })
  }
  const [path, query = ''] = url.slice(BASE_URL.length).split('?')
  const params = new URLSearchParams(query)
  const header = (name: string) =>
    request.headers.find((h) => h.key.trim().toLowerCase() === name.toLowerCase())?.value
  const auth = substitute(state, header('Authorization') ?? '')
  const token = /^Bearer\s+(\S+)$/i.exec(auth.trim())?.[1]
  const caller = state.server.tokens.find((t) => t.token === token)
  if (!caller)
    return reply(401, {
      error: 'Missing or invalid token. Send: Authorization: Bearer <token>',
    })

  const segments = path.replace(/\/+$/, '').split('/').filter(Boolean)
  if (segments[0] !== 'v1')
    return reply(404, { error: `No such endpoint: ${path || '/'}` })
  const resource = segments[1]
  const id = segments[2] !== undefined ? Number(segments[2]) : null
  const writes = request.method !== 'GET'
  if (writes && caller.scope !== 'write') {
    return reply(403, {
      error: 'This token can only read. Use a token with write access.',
    })
  }
  const parseBody = (): { ok: true; value: Record<string, unknown> } | { ok: false } => {
    try {
      const value: unknown = JSON.parse(substitute(state, request.body || '{}'))
      return value && typeof value === 'object' && !Array.isArray(value)
        ? { ok: true, value: value as Record<string, unknown> }
        : { ok: false }
    } catch {
      return { ok: false }
    }
  }

  if (resource === 'projects' && id === null) {
    if (request.method !== 'GET')
      return reply(405, { error: 'Projects can only be read.' })
    return reply(200, state.server.projects)
  }
  if (resource !== 'timesheets') return reply(404, { error: `No such endpoint: ${path}` })

  if (id === null) {
    if (request.method === 'GET') {
      const person = params.get('person')
      const project = params.get('project')
      return reply(
        200,
        state.server.entries.filter(
          (e) => (!person || e.person === person) && (!project || e.project === project),
        ),
      )
    }
    if (request.method === 'POST') {
      const body = parseBody()
      if (!body.ok) return reply(400, { error: 'The body is not valid JSON.' })
      const errors = validate(state, body.value as Partial<Entry>)
      if (errors.length) return reply(422, { errors })
      const entry: Entry = {
        id: state.server.nextId,
        person: String(body.value.person),
        project: String(body.value.project),
        date: String(body.value.date),
        hours: Number(body.value.hours),
        description: String(body.value.description).trim(),
      }
      return reply(201, entry, {
        ...state,
        server: {
          ...state.server,
          entries: [...state.server.entries, entry],
          nextId: entry.id + 1,
        },
      })
    }
    return reply(405, { error: `${request.method} is not allowed on /v1/timesheets.` })
  }

  const entry = state.server.entries.find((e) => e.id === id)
  if (!entry) return reply(404, { error: `No timesheet entry with id ${segments[2]}.` })
  if (request.method === 'GET') return reply(200, entry)
  if (request.method === 'DELETE') {
    return reply(204, null, {
      ...state,
      server: {
        ...state.server,
        entries: state.server.entries.filter((e) => e.id !== id),
      },
    })
  }
  if (request.method === 'PATCH') {
    const body = parseBody()
    if (!body.ok) return reply(400, { error: 'The body is not valid JSON.' })
    const updated = { ...entry, ...body.value, id: entry.id } as Entry
    // The bug: hours are not checked on PATCH (the other fields are).
    const errors = validate(state, { ...updated, hours: 1 })
    if (errors.length) return reply(422, { errors })
    return reply(200, updated, {
      ...state,
      server: {
        ...state.server,
        entries: state.server.entries.map((e) => (e.id === id ? updated : e)),
      },
    })
  }
  return reply(405, { error: `${request.method} is not allowed here.` })
}

/** Sends a request: the API answers, and the request goes into the history. */
export function send(state: ApiState, request: ApiRequest): ApiState {
  const { state: next, response } = handle(state, request)
  return {
    ...next,
    history: [
      ...next.history,
      {
        ...request,
        sentUrl: substitute(state, request.url).slice(0, 500),
        status: response.status,
        response:
          response.body === null
            ? ''
            : JSON.stringify(response.body, null, 2).slice(0, 10000),
      },
    ].slice(-300),
  }
}
