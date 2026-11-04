import { describe, expect, it } from 'vitest'
import {
  closeWindow,
  EMPTY_DESK,
  fitToArea,
  focusedWindow,
  focusWindow,
  keyOf,
  MIN_SIZE,
  minimizeAll,
  minimizeWindow,
  moveWindow,
  openSystemWindow,
  openWindow,
  readDesk,
  resizeWindow,
  taskbarClick,
  toggleMaximize,
  writeDesk,
} from './windowManager'
import {
  DEFAULT_SETTINGS,
  layoutIcons,
  readSettings,
  writeSettings,
} from './desktopSettings'

const AREA = { w: 1400, h: 800 }

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (n) => [...data.keys()][n] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  }
}

describe('window manager', () => {
  it('gives each app one window, and each tool its own', () => {
    expect(keyOf({ app: 'mail', mailId: 'x' })).toBe('mail')
    expect(keyOf({ app: 'tool', tool: 'books' })).toBe('tool:books')
    let desk = openWindow(EMPTY_DESK, { app: 'mail' }, AREA)
    desk = openWindow(desk, { app: 'mail', mailId: 'welcome' }, AREA)
    expect(desk.windows).toHaveLength(1)
    expect(desk.windows[0].view).toEqual({ app: 'mail', mailId: 'welcome' })
  })

  it('opens new windows in front, cascaded, and full screen on small screens', () => {
    let desk = openWindow(EMPTY_DESK, { app: 'mail' }, AREA)
    desk = openWindow(desk, { app: 'tasks' }, AREA)
    const [mail, tasks] = desk.windows
    expect(focusedWindow(desk)?.key).toBe('tasks')
    expect(tasks.x).toBeGreaterThan(mail.x)
    expect(tasks.y).toBeGreaterThan(mail.y)
    expect(mail.maximized).toBe(false)
    expect(mail.x + mail.w).toBeLessThanOrEqual(AREA.w)
    expect(mail.y + mail.h).toBeLessThanOrEqual(AREA.h)

    const small = openWindow(EMPTY_DESK, { app: 'mail' }, { w: 800, h: 600 })
    expect(small.windows[0].maximized).toBe(true)
  })

  it('brings a window to the front, and restores it when minimised', () => {
    let desk = openWindow(EMPTY_DESK, { app: 'mail' }, AREA)
    desk = openWindow(desk, { app: 'tasks' }, AREA)
    desk = focusWindow(desk, 'mail')
    expect(focusedWindow(desk)?.key).toBe('mail')
    desk = minimizeWindow(desk, 'mail')
    expect(focusedWindow(desk)?.key).toBe('tasks')
    desk = openWindow(desk, { app: 'mail' }, AREA)
    expect(desk.windows.find((w) => w.key === 'mail')?.minimized).toBe(false)
    expect(focusedWindow(desk)?.key).toBe('mail')
  })

  it('does nothing when the window in front is focused again', () => {
    const desk = openWindow(EMPTY_DESK, { app: 'mail' }, AREA)
    expect(focusWindow(desk, 'mail')).toBe(desk)
  })

  it('makes taskbar buttons open, bring forward, and minimise', () => {
    let desk = taskbarClick(EMPTY_DESK, { app: 'mail' }, AREA)
    expect(desk.windows).toHaveLength(1)
    desk = taskbarClick(desk, { app: 'tasks' }, AREA)
    // Mail is behind Tasks: the first click brings it forward...
    desk = taskbarClick(desk, { app: 'mail' }, AREA)
    expect(focusedWindow(desk)?.key).toBe('mail')
    // ...the second minimises it...
    desk = taskbarClick(desk, { app: 'mail' }, AREA)
    expect(desk.windows.find((w) => w.key === 'mail')?.minimized).toBe(true)
    // ...and the third restores it.
    desk = taskbarClick(desk, { app: 'mail' }, AREA)
    expect(focusedWindow(desk)?.key).toBe('mail')
  })

  it('maximises, restores, minimises all and closes', () => {
    let desk = openWindow(EMPTY_DESK, { app: 'mail' }, AREA)
    desk = openWindow(desk, { app: 'tasks' }, AREA)
    desk = toggleMaximize(desk, 'mail')
    expect(desk.windows[0].maximized).toBe(true)
    desk = toggleMaximize(desk, 'mail')
    expect(desk.windows[0].maximized).toBe(false)
    desk = minimizeAll(desk)
    expect(focusedWindow(desk)).toBeUndefined()
    desk = closeWindow(desk, 'mail')
    expect(desk.windows.map((w) => w.key)).toEqual(['tasks'])
  })

  it('keeps moved windows grabbable and resized windows within limits', () => {
    let desk = openWindow(EMPTY_DESK, { app: 'mail' }, AREA)
    desk = moveWindow(desk, 'mail', -5000, -300, AREA)
    const moved = desk.windows[0]
    expect(moved.y).toBe(0)
    expect(moved.x + moved.w).toBeGreaterThanOrEqual(120)
    desk = moveWindow(desk, 'mail', 5000, 5000, AREA)
    expect(desk.windows[0].x).toBeLessThanOrEqual(AREA.w - 120)
    expect(desk.windows[0].y).toBeLessThanOrEqual(AREA.h - 40)

    desk = moveWindow(desk, 'mail', 100, 50, AREA)
    desk = resizeWindow(desk, 'mail', 10, 10, AREA)
    expect(desk.windows[0]).toMatchObject(MIN_SIZE)
    desk = resizeWindow(desk, 'mail', 9999, 9999, AREA)
    expect(desk.windows[0].w).toBe(AREA.w - 100)
    expect(desk.windows[0].h).toBe(AREA.h - 50)
  })

  it('fits windows to a smaller screen', () => {
    let desk = openWindow(EMPTY_DESK, { app: 'mail' }, AREA)
    desk = moveWindow(desk, 'mail', 1200, 700, AREA)
    desk = fitToArea(desk, { w: 900, h: 600 })
    const w = desk.windows[0]
    expect(w.w).toBeLessThanOrEqual(900)
    expect(w.h).toBeLessThanOrEqual(600)
    expect(w.x).toBeLessThanOrEqual(900 - 120)
    expect(w.y).toBeLessThanOrEqual(600 - 40)
  })

  it('opens the computer’s own windows at a modest size', () => {
    const desk = openSystemWindow(EMPTY_DESK, 'settings', AREA)
    expect(desk.windows[0]).toMatchObject({ key: 'system:settings', system: 'settings' })
    expect(desk.windows[0].w).toBeLessThanOrEqual(560)
    expect(openSystemWindow(desk, 'settings', AREA).windows).toHaveLength(1)
  })

  it('remembers the layout per career save, ignoring damaged data', () => {
    const store = memoryStorage()
    const desk = openWindow(EMPTY_DESK, { app: 'sheets', document: 'practice' }, AREA)
    writeDesk('p1', desk, store)
    expect(readDesk('p1', store)).toEqual(desk)
    expect(readDesk('p2', store)).toBeNull()
    store.setItem('gamhub-worksim:desk:p3', '{"windows":[{"key":1}]}')
    expect(readDesk('p3', store)).toBeNull()
    store.setItem('gamhub-worksim:desk:p4', 'not json')
    expect(readDesk('p4', store)).toBeNull()
  })
})

describe('desktop icons', () => {
  const icons = [
    { id: 'bin', side: 'left' as const },
    { id: 'mail', side: 'left' as const },
    { id: 'tasks', side: 'left' as const },
    { id: 'career', side: 'right' as const },
  ]

  it('fills down the left and right edges by default', () => {
    const cells = layoutIcons(icons, {}, { columns: 10, rows: 2 })
    expect(cells).toEqual({
      bin: { column: 0, row: 0 },
      mail: { column: 0, row: 1 },
      tasks: { column: 1, row: 0 },
      career: { column: 9, row: 0 },
    })
  })

  it('keeps moved icons where they were put, and others make way', () => {
    const cells = layoutIcons(
      icons,
      { tasks: { column: 0, row: 0 } },
      { columns: 10, rows: 2 },
    )
    expect(cells.tasks).toEqual({ column: 0, row: 0 })
    expect(cells.bin).toEqual({ column: 0, row: 1 })
    expect(cells.mail).toEqual({ column: 1, row: 0 })
  })

  it('puts an icon back in order when its place is off screen or taken', () => {
    const cells = layoutIcons(
      icons,
      {
        mail: { column: 40, row: 0 },
        tasks: { column: 9, row: 0 },
        career: { column: 9, row: 0 },
      },
      { columns: 10, rows: 2 },
    )
    expect(cells.tasks).toEqual({ column: 9, row: 0 })
    expect(cells.career).toEqual({ column: 9, row: 1 })
    expect(cells.mail).toEqual({ column: 0, row: 1 })
    const all = Object.values(cells).map((c) => `${c.column}:${c.row}`)
    expect(new Set(all).size).toBe(all.length)
  })

  it('remembers settings per career save, with defaults for anything missing', () => {
    const store = memoryStorage()
    expect(readSettings('p1', store)).toEqual(DEFAULT_SETTINGS)
    writeSettings(
      'p1',
      { ...DEFAULT_SETTINGS, wallpaper: 'harbour', iconSize: 'large' },
      store,
    )
    expect(readSettings('p1', store)).toMatchObject({
      wallpaper: 'harbour',
      iconSize: 'large',
    })
    store.setItem('gamhub-worksim:desktop:p2', '{"wallpaper":"space"}')
    expect(readSettings('p2', store)).toEqual(DEFAULT_SETTINGS)
    store.setItem('gamhub-worksim:desktop:p3', '{}')
    expect(readSettings('p3', store)).toEqual(DEFAULT_SETTINGS)
  })
})
