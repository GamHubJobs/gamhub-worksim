import { describe, expect, it } from 'vitest'
import { timesheetApi } from './definition'
import type { ApiRequest } from './schema'
import { handle, send, substitute } from './server'

const req = (
  method: ApiRequest['method'],
  path: string,
  token?: string,
  body = '',
): ApiRequest => ({
  method,
  url: `{{baseUrl}}${path}`,
  headers: token ? [{ key: 'Authorization', value: `Bearer {{${token}}}` }] : [],
  body,
})
const valid = {
  person: 'ines.duarte',
  project: 'PRJ-2210',
  date: '2026-03-04',
  hours: 7.5,
  description: 'Workshop materials',
}

describe('the timesheet API', () => {
  it('fills in environment variables', () => {
    expect(substitute(timesheetApi(), '{{baseUrl}}/v1 {{ readToken }} {{nope}}')).toBe(
      'https://api.cobaltridge.example/v1 crk_read_7f3a91c2 {{nope}}',
    )
  })

  it('checks the token and its permissions', () => {
    const api = timesheetApi()
    expect(handle(api, req('GET', '/v1/projects')).response.status).toBe(401)
    expect(handle(api, req('GET', '/v1/projects', 'readToken')).response.status).toBe(200)
    expect(
      handle(api, req('POST', '/v1/timesheets', 'readToken', JSON.stringify(valid)))
        .response.status,
    ).toBe(403)
  })

  it('creates valid entries, and refuses invalid ones with their errors', () => {
    let api = send(
      timesheetApi(),
      req('POST', '/v1/timesheets', 'writeToken', JSON.stringify(valid)),
    )
    expect(api.history[0].status).toBe(201)
    expect(api.server.entries.at(-1)).toMatchObject({
      id: 4,
      person: 'ines.duarte',
      hours: 7.5,
    })
    const bad = handle(
      api,
      req(
        'POST',
        '/v1/timesheets',
        'writeToken',
        JSON.stringify({ ...valid, hours: 14, project: 'X' }),
      ),
    )
    expect(bad.response).toEqual({
      status: 422,
      body: {
        errors: [
          'project must be an existing project code',
          'hours must be more than 0 and no more than 12',
        ],
      },
    })
    expect(
      handle(api, req('POST', '/v1/timesheets', 'writeToken', '{oops')).response.status,
    ).toBe(400)
    api = send(api, req('GET', '/v1/timesheets?person=ines.duarte', 'readToken'))
    expect(JSON.parse(api.history.at(-1)!.response)).toHaveLength(1)
  })

  it('reads, deletes and answers unknown paths and methods', () => {
    let api = timesheetApi()
    expect(
      handle(api, req('GET', '/v1/timesheets/99', 'readToken')).response.status,
    ).toBe(404)
    expect(handle(api, req('GET', '/v2/things', 'readToken')).response.status).toBe(404)
    expect(handle(api, req('DELETE', '/v1/projects', 'writeToken')).response.status).toBe(
      405,
    )
    api = send(api, req('DELETE', '/v1/timesheets/1', 'writeToken'))
    expect(api.history[0].status).toBe(204)
    expect(api.server.entries.map((e) => e.id)).toEqual([2, 3])
  })

  it('has the planted bug: PATCH does not check hours (but does check the rest)', () => {
    const api = timesheetApi()
    expect(
      handle(api, req('PATCH', '/v1/timesheets/1', 'writeToken', '{"hours": 20}'))
        .response.status,
    ).toBe(200)
    expect(
      handle(api, req('PATCH', '/v1/timesheets/1', 'writeToken', '{"date": "soon"}'))
        .response.status,
    ).toBe(422)
  })
})
