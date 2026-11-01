import { expect, test } from '@playwright/test'
import { openApp } from './helpers.ts'

test('the performance record counts real work, explains it and survives a reload', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await page.goto('/')
  await page.getByRole('radio', { name: /Office Administration/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Career')
  const record = page.getByTestId('performance-record')
  await expect(record.getByTestId('record-customers')).toContainText(
    'Customer cases handled0',
  )

  // Handle a client case, then look again.
  await openApp(page, 'Cases')
  await page.evaluate("window.__worksim.arriveCase('fa-short-delivery')")
  await page.getByRole('list', { name: 'Cases' }).getByRole('button').first().click()
  const detail = page.getByTestId('case-detail')
  await page.evaluate("window.__worksim.answerCase('fa-short-delivery')")
  await detail.getByRole('button', { name: /^Submit to / }).click()
  await detail.getByRole('button', { name: 'Send my answer' }).click()
  await expect(detail.getByTestId('case-score')).toHaveText('100%')

  await openApp(page, 'Career')
  const customers = record.getByTestId('record-customers')
  await expect(customers).toContainText('Customer cases handled1')
  await expect(customers).toContainText('Average score100%')
  await expect(customers).toContainText('The average of your scores')
  await expect(
    record.getByTestId('record-periods').getByRole('row', { name: /Intern/ }),
  ).toContainText('Day 1')

  await page.reload()
  await openApp(page, 'Career')
  await expect(page.getByTestId('record-customers')).toContainText(
    'Customer cases handled1',
  )
})
