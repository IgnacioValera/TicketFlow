import type { Locator } from '@playwright/test'

type SelectChoice = string | { label?: string; index?: number }

export async function chooseSelectOption(locator: Locator, option: SelectChoice) {
  await locator.click()
  const list = locator.page().getByRole('listbox')
  await list.waitFor({ state: 'visible' })
  if (typeof option === 'string') {
    await list.locator(`[role="option"][data-value="${option}"]`).click()
    return
  }
  if (option.label) {
    await list.getByRole('option', { name: option.label }).click()
    return
  }
  await list.getByRole('option').nth(option.index ?? 0).click()
}
