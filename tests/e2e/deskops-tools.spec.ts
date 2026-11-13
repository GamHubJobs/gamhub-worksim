import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

/**
 * The Help Desk's Tools menu (IT Operations): the Server Room and mail
 * consoles fix real faults, and a computer is built on the bench, registered
 * and shipped to someone at home; the tickets resolve from the systems.
 */
const shots = process.env.WORKSIM_SHOTS ?? 'test-results/deskops'

async function startTask(page: Page, id: string, title: RegExp) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
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

test('Server Room and mail: the floor switch, the spooler and a full mailbox', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startTask(page, 'server-room-mail', /The server room and the mail system/)

  // The Tools menu is always there.
  for (const name of [
    'Server Room',
    'Computer Deployment',
    'PC Shelf',
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

  // Reboot the hung switch only.
  await room.getByRole('tab', { name: 'Devices' }).click()
  const sw = room.locator('[data-testid="network-device"][data-node="SW-F2"]')
  await sw.getByRole('button', { name: 'Reboot' }).click()
  await sw.getByRole('button', { name: 'Yes, reboot' }).click()
  await expect(page.getByTestId('ticket-update')).toContainText('Resolved automatically')

  // Start the spooler rather than rebooting the print server.
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
  await page.screenshot({ path: `${shots}/tools-mail-security.png` })
})

test('Computer Deployment to Ship Manager: Rosa’s laptop built, registered and delivered', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startTask(
    page,
    'hardware-logistics',
    /A dead laptop, a new supervisor and a parcel/,
  )

  await section(page, 'Computer Deployment')
  await page
    .getByTestId('deployment-menu')
    .getByRole('button', { name: 'Start' })
    .first()
    .click()
  const run = page.getByTestId('deployment-run')
  await expect(page.getByTestId('sop')).toContainText('IT-SOP-014')
  await run.getByRole('button', { name: /I have read the SOP/ }).click()
  await run.getByRole('button', { name: /New laptop from stock/ }).click()

  // A plug that does not fit is refused.
  const tray = (cable: string) =>
    run.locator(`[data-testid="cable"][data-cable="${cable}"]`)
  const port = (id: string) => run.locator(`[data-port="${id}"]`)
  await tray('eth-device').click()
  await port('dock-dp1').click()
  await expect(page.getByTestId('itops-feedback')).toContainText('does not fit')

  // Drag the dock's power lead by its connector onto the dock's power socket.
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

  const plug = async (cable: string, id: string) => {
    await tray(cable).click()
    await port(id).click()
  }
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
  ])
    await plug(c, p)
  // The equipment responds to what is really connected.
  await expect(run.getByTestId('cabling-progress')).toContainText('10 of 10 connected')
  await expect(run.getByRole('application', { name: 'Workbench' })).toContainText(
    'Signal: 2560 × 1440',
  )
  // The laptop's other side, and its lid.
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

  await section(page, 'PC Shelf')
  await expect(
    page.locator('[data-testid="shelf-unit"][data-tag="A-1100"]'),
  ).toContainText('CR-L1100')
  await page.screenshot({ path: `${shots}/tools-pc-shelf.png` })

  // Register it.
  await section(page, 'Asset Management')
  const assets = page.getByTestId('asset-management')
  await assets.getByRole('tab', { name: /New asset/ }).click()
  await assets.getByRole('button', { name: 'Register asset' }).click()
  await page.screenshot({ path: `${shots}/tools-assets.png` })

  // Ship it to Rosa's confirmed address with a return label.
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

test('Repair Bench: Dana’s laptop opened safely, the memory replaced, and proved', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startTask(
    page,
    'hardware-logistics',
    /A dead laptop, a new supervisor and a parcel/,
  )
  await section(page, 'Repair Bench')
  const bench = page.getByTestId('repair-bench')
  await bench.getByRole('button', { name: 'Book in A-1003' }).click()
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
  await bench.getByRole('button', { name: 'Repair complete: return it' }).click()
  await expect(page.getByTestId('ticket-update')).toContainText('INC-4205')
})
