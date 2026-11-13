import { expect, test, type Page } from '@playwright/test'
import { openApp, sitAtComputer } from './helpers.ts'

/**
 * The IT Help Desk as a job in a living office:
 * - the Tools at the computer (Server Room, mail, assets, shipping) fix what
 *   can be fixed remotely;
 * - hands-on work is done in person: the player leaves the desk, walks to
 *   the equipment in the 3D office, presses E, works the close-up simulation
 *   (the comms cabinet, the IT workbench, a colleague's desk), steps back,
 *   and the ticket resolves from the systems.
 */
const shots = process.env.WORKSIM_SHOTS ?? 'test-results/deskops'

const player = (page: Page) =>
  page.evaluate(
    () =>
      (globalThis as unknown as { __worksimPlayer: { x: number; z: number } })
        .__worksimPlayer,
  )

async function startTask(page: Page, id: string, title: RegExp) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
  // Walking and the activities in 3D go faster in tests (development builds only).
  await page.evaluate(
    "window.__worksimSpeed = 12; sessionStorage.setItem('worksim.testSpeed', '12')",
  )
  await openApp(page, 'Tasks')
  await page.evaluate(`window.__worksim.skipTo('${id}')`)
  await page.getByRole('button', { name: title }).first().click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('helpdesk')).toBeVisible()
}

const section = (page: Page, name: string) =>
  page
    .getByRole('tablist', { name: 'Help Desk and the company’s systems' })
    .getByRole('tab', { name, exact: true })
    .click()

/** Gets up from the computer into the 3D office. */
async function leaveDesk(page: Page) {
  await page.getByRole('button', { name: 'Leave desk' }).click()
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
}

/** Walks to a job's equipment in the office (from the IT jobs list) and uses it. */
async function goTo(page: Page, job: RegExp) {
  await page.getByTestId('it-jobs').getByRole('button', { name: job }).click()
  await expect(page.getByTestId('onsite')).toBeVisible({ timeout: 120_000 })
}

test('Server Room and mail at the computer, then the hung switch power-cycled in person', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startTask(page, 'server-room-mail', /The server room and the mail system/)

  // The Tools menu is always there.
  for (const name of [
    'Server Room',
    'Computer Deployment',
    'PC Shelf',
    'Repair Bench',
    'Mail Admin',
    'Mail Security',
    'Asset Management',
    'Ship Manager',
  ])
    await expect(page.getByRole('tab', { name, exact: true })).toBeVisible()

  await section(page, 'Server Room')
  const room = page.getByTestId('server-room')
  await expect(room.getByTestId('server-issues')).toContainText('SW-F2 is not responding')
  await page.screenshot({ path: `${shots}/tools-server-room.png` })
  await room.getByRole('tab', { name: 'Topology' }).click()
  await expect(
    room.locator('[data-testid="topology-node"][data-state="down"]'),
  ).toContainText('SW-F2')
  await page.screenshot({ path: `${shots}/tools-topology.png` })

  // A hung switch does not answer the console: it is dealt with in person.
  await room.getByRole('tab', { name: 'Devices' }).click()
  await expect(
    room
      .locator('[data-testid="network-device"][data-node="SW-F2"]')
      .getByTestId('on-site-only'),
  ).toContainText('office comms cabinet')

  // Remote work: start the spooler rather than rebooting the print server.
  await room.getByRole('tab', { name: 'Servers' }).click()
  await room.getByRole('button', { name: 'Start Print Spooler on PRINT01' }).click()
  await expect(page.getByTestId('ticket-update')).toContainText('INC-4103')

  // Mail: the trace shows the full mailbox; the archive fixes it.
  await section(page, 'Mail Admin')
  const mail = page.getByTestId('mail-admin')
  await mail.getByLabel('Mailbox').fill('owen.price')
  await mail.getByRole('button', { name: 'Run mail trace' }).click()
  await expect(
    mail.locator('[data-testid="trace-row"][data-status="failed"]'),
  ).toContainText('552 5.2.2')
  await page.screenshot({ path: `${shots}/tools-mail-trace.png` })
  await mail.getByRole('tab', { name: 'Mailbox Admin' }).click()
  await mail.getByRole('button', { name: 'View mailbox' }).click()
  await expect(page.getByTestId('mailbox-admin')).toContainText('over quota')
  await mail.getByRole('button', { name: 'Enable Online Archive' }).click()
  await expect(page.getByTestId('ticket-update')).toContainText('INC-4104')

  // Mail Security: the look-alike is there next to the real one.
  await section(page, 'Mail Security')
  const sec = page.getByTestId('mail-security')
  await sec.getByLabel('Mailbox').fill('grace.mensah')
  await sec.getByRole('button', { name: 'Review' }).click()
  await expect(sec.getByTestId('quarantine-row')).toHaveCount(3)
  await expect(sec).toContainText('harl0w-audit.example')

  // In person: up from the desk, across the office to the comms cabinet.
  await leaveDesk(page)
  await expect(page.getByTestId('it-jobs')).toContainText('SW-F2 is not responding')
  await page.screenshot({ path: `${shots}/tools-office-jobs.png` })
  // The top-down view of the floor (it stays chosen), then back to behind.
  await page.getByRole('button', { name: 'View: from behind' }).click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${shots}/tools-office-top-down.png` })
  await page.getByRole('button', { name: 'View: top-down' }).click()
  await goTo(page, /SW-F2 is not responding/)
  const me = await player(page)
  expect(Math.hypot(me.x - 10.72, me.z - 2.2)).toBeLessThan(0.6)
  const cabinet = page.getByTestId('comms-cabinet')
  await cabinet.locator('[data-testid="rack-device"][data-node="SW-F2"]').click()
  await expect(cabinet).toContainText('The switch has hung')
  await page.screenshot({ path: `${shots}/tools-cabinet.png` })
  const outlet = cabinet.locator('[data-testid="outlet"][data-node="SW-F2"]')
  await outlet.click()
  await expect(
    cabinet.locator('[data-node="SW-F2"][data-lights="off"]').first(),
  ).toBeVisible()
  await outlet.click()
  await expect(
    cabinet.locator('[data-testid="rack-device"][data-node="SW-F2"]'),
  ).toHaveAttribute('data-lights', 'up', { timeout: 10_000 })
  await page.getByRole('button', { name: /Step back to the office/ }).click()
  await expect(page.getByTestId('onsite')).toHaveCount(0)
  // The job is done: the marker and the list entry are gone, and the tickets resolved.
  await expect(page.getByTestId('it-jobs')).toHaveCount(0)
  await openApp(page, 'Help Desk')
  await page
    .getByRole('button', { name: /infrastructure and mail/ })
    .first()
    .click()
  await section(page, 'Ticket queue')
  await page
    .getByRole('list', { name: 'Tickets' })
    .getByRole('button', { name: /INC-4101/ })
    .click()
  await expect(page.getByLabel('Status')).toHaveValue('resolved')
  await expect(page.getByLabel('Ticket history')).toContainText('Power-cycle SW-F2')
})

test('A laptop built at the IT workbench in the office, registered and shipped from the computer', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startTask(
    page,
    'hardware-logistics',
    /A dead laptop, a new supervisor and a parcel/,
  )

  // At the computer, Computer Deployment says where the work is done.
  await section(page, 'Computer Deployment')
  await expect(page.getByTestId('go-there')).toContainText('IT workbench')

  await leaveDesk(page)
  await goTo(page, /Build a computer at the IT workbench/)
  const onsite = page.getByTestId('onsite')
  await onsite
    .getByTestId('deployment-menu')
    .getByRole('button', { name: 'Start' })
    .first()
    .click()
  const run = onsite.getByTestId('deployment-run')
  await expect(onsite.getByTestId('sop')).toContainText('IT-SOP-014')
  await run.getByRole('button', { name: /I have read the SOP/ }).click()
  await run.getByRole('button', { name: /New laptop from stock/ }).click()

  // A plug that does not fit is refused.
  const tray = (cable: string) =>
    run.locator(`[data-testid="cable"][data-cable="${cable}"]`)
  const port = (id: string) => run.locator(`[data-port="${id}"]`)
  await tray('eth-device').click()
  await port('dock-dp1').click()
  await expect(onsite.getByTestId('itops-feedback')).toContainText('does not fit')

  // Drag the dock's power lead by its connector onto the dock's power socket.
  await run.getByRole('application', { name: 'Workbench' }).scrollIntoViewIfNeeded()
  const from = (await tray('dock-psu').boundingBox())!
  const to = (await port('dock-power').boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + 60, from.y - 120, { steps: 5 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 })
  await page.mouse.up()
  await expect(
    run.locator('[data-testid="connected-cable"][data-cable="dock-psu"]'),
  ).toBeVisible()

  for (const [c, p] of [
    ['dock-cable', 'lap-usbc1'],
    ['power-mon', 'mon-power'],
    ['eth-device', 'dock-lan'],
    ['eth-wall', 'wall-data'],
    ['dp-device', 'dock-dp1'],
    ['dp-mon', 'mon-dp'],
    ['keyboard', 'dock-usb1'],
    ['mouse', 'dock-usb2'],
    ['headset', 'dock-usb3'],
  ]) {
    await tray(c).click()
    await port(p).click()
  }
  // The equipment responds to what is really connected.
  await expect(run.getByTestId('cabling-progress')).toContainText('10 of 10 connected')
  await expect(run.getByRole('application', { name: 'Workbench' })).toContainText(
    'Signal: 2560 × 1440',
  )
  await run.getByRole('button', { name: 'Right side' }).click()
  await expect(port('lap-usb1')).toBeVisible()
  await run.getByRole('button', { name: /Left side/ }).click()
  await page.screenshot({ path: `${shots}/tools-cabling.png` })
  await run.getByRole('button', { name: 'Check the connections and continue' }).click()

  // Catch the boot menu and boot from the network on IPv4.
  await expect(run).toHaveAttribute('data-step', 'boot')
  await run.getByRole('button', { name: 'Power on' }).click()
  await run
    .getByRole('group', { name: 'Send keys to the bench machine' })
    .getByRole('button', { name: 'F12' })
    .click()
  await run.getByRole('button', { name: 'UEFI: PXE IPv4 Onboard Ethernet' }).click()
  await run.getByLabel('Password').fill('Image-Cobalt-2611')
  await run.getByRole('button', { name: 'OK' }).click()
  await run.getByLabel(/Cobalt Standard Workstation/).check()
  await run.getByRole('button', { name: 'Next' }).click()
  await run.getByLabel('OSDComputerName').fill('CR-L1100')
  await run.getByRole('button', { name: 'Begin' }).click()
  await expect(run.getByRole('button', { name: 'Continue' })).toBeEnabled({
    timeout: 15_000,
  })
  await run.getByRole('button', { name: 'Continue' }).click()
  await run.getByLabel('User name').fill('CORP\\buildcheck')
  await run.getByLabel('Password').fill('Ridge!Welcome9')
  await run.getByRole('button', { name: 'Sign in' }).click()
  await run.getByRole('button', { name: 'Put it on the PC Shelf' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('onsite')).toHaveCount(0)

  // Back at the computer: the unit is on the shelf; register it and ship it.
  await sitAtComputer(page)
  await openApp(page, 'Help Desk')
  await page
    .getByRole('button', { name: /hardware and logistics/ })
    .first()
    .click()
  await section(page, 'PC Shelf')
  await expect(
    page.locator('[data-testid="shelf-unit"][data-tag="A-1100"]'),
  ).toContainText('CR-L1100')
  await page.screenshot({ path: `${shots}/tools-pc-shelf.png` })
  await section(page, 'Asset Management')
  const assets = page.getByTestId('asset-management')
  await assets.getByRole('tab', { name: /New asset/ }).click()
  await assets.getByRole('button', { name: 'Register asset' }).click()
  await page.screenshot({ path: `${shots}/tools-assets.png` })

  await section(page, 'Ship Manager')
  const ship = page.getByTestId('ship-manager')
  await ship.getByLabel('Recipient name').selectOption('rosa.delgado')
  await ship.getByRole('button', { name: /Message Rosa/ }).click()
  await ship.getByRole('button', { name: 'Use this address' }).click()
  await ship
    .getByLabel('Reference (the ticket this shipment is for)')
    .selectOption('INC-4201')
  await ship.getByLabel(/Computer \(from the shelf\)/).check()
  await ship.getByLabel('Select a computer to ship').selectOption('A-1100')
  await ship.getByLabel('Shipping speed').selectOption('priority')
  await ship.getByLabel('Include a prepaid return label').check()
  await ship.getByLabel('Returning to').selectOption('it')
  await page.screenshot({ path: `${shots}/tools-ship-manager.png` })
  await ship.getByRole('button', { name: 'Ship', exact: true }).click()
  await expect(ship.getByTestId('shipment')).toHaveAttribute('data-status', 'delivered', {
    timeout: 20_000,
  })
  await expect(ship.getByTestId('shipment')).toContainText('everything works')
  await expect(page.getByTestId('ticket-update')).toContainText('INC-4201')
})

test('The Tools work in every queue: the first task gets the company estate', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Tasks')
  await page
    .getByRole('button', { name: /Triage the morning queue/ })
    .first()
    .click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('helpdesk')).toBeVisible()
  await section(page, 'Asset Management')
  await expect(page.getByTestId('asset-management')).toContainText('Register consistent')
  await section(page, 'Server Room')
  await expect(page.getByTestId('server-room')).toContainText('15 of 15 nodes up')
})

test('Dana’s laptop: collected at her desk, repaired at the IT workbench, handed back in person', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startTask(
    page,
    'hardware-logistics',
    /A dead laptop, a new supervisor and a parcel/,
  )
  // At the computer, the Repair Bench says the work is in person.
  await section(page, 'Repair Bench')
  await expect(page.getByTestId('go-there')).toContainText('collect it from')

  await leaveDesk(page)
  // Walk to Dana's desk and collect it.
  await goTo(page, /Collect Dana’s laptop/)
  const visit = page.getByTestId('desk-visit')
  await visit.getByRole('button', { name: 'Take it to the workbench' }).click()
  await expect(page.getByTestId('desk-reply')).toContainText('spare desk PC')
  await page.getByRole('button', { name: /Step back to the office/ }).click()

  // Across the office to the IT workbench.
  await goTo(page, /Repair A-1003 at the IT workbench/)
  const bench = page.getByTestId('repair-bench')
  await bench.getByRole('button', { name: 'Power-on test' }).click()
  await expect(bench.getByTestId('test-log')).toContainText('three short beeps')
  for (let i = 1; i <= 8; i++)
    await bench.getByRole('button', { name: `Screw ${i}`, exact: true }).click()
  await bench.getByRole('button', { name: 'Lift cover' }).click()
  await bench.getByRole('button', { name: 'Memory (SO-DIMM)' }).click()
  await bench.getByRole('button', { name: /Remove memory/ }).click()
  await expect(page.getByTestId('itops-feedback')).toContainText(
    'Disconnect the battery first',
  )
  await bench.getByTestId('battery-connector').click()
  await bench.getByRole('button', { name: /Remove memory/ }).click()
  await page.screenshot({ path: `${shots}/tools-repair-open.png` })
  await bench.getByLabel('16 GB DDR4-3200 SO-DIMM').check()
  await bench.getByRole('button', { name: 'Fit the selected part' }).click()
  await expect(page.getByTestId('itops-feedback')).toContainText('keyed differently')
  await bench.getByLabel('16 GB DDR5-5600 SO-DIMM').check()
  await bench.getByRole('button', { name: 'Fit the selected part' }).click()
  await bench.getByTestId('battery-connector').click()
  await bench.getByRole('button', { name: 'Refit cover' }).click()
  for (let i = 1; i <= 8; i++)
    await bench.getByRole('button', { name: `Screw ${i} (out)` }).click()
  await bench.getByRole('button', { name: 'Power-on test' }).click()
  await expect(bench.getByTestId('test-log')).toContainText(
    'Boots to the Windows sign-in',
  )
  await expect(bench.getByTestId('return-hint')).toContainText('take it back to')
  await page.getByRole('button', { name: /Step back to the office/ }).click()

  // Back to Dana's desk to hand it over: her ticket resolves.
  await goTo(page, /Return A-1003 to Dana/)
  await page
    .getByTestId('desk-visit')
    .getByRole('button', { name: 'Hand it back' })
    .click()
  await expect(page.getByTestId('desk-reply')).toContainText('It’s working')
  await page.getByRole('button', { name: /Step back to the office/ }).click()
  await openApp(page, 'Help Desk')
  await page
    .getByRole('button', { name: /hardware and logistics/ })
    .first()
    .click()
  await section(page, 'Ticket queue')
  await page
    .getByRole('list', { name: 'Tickets' })
    .getByRole('button', { name: /INC-4205/ })
    .click()
  await expect(page.getByLabel('Status')).toHaveValue('resolved')
})
