/**
 * SAA-1484 — browser contract of the `/calendar` demo page.
 *
 * Drives the real page served by the Playwright `webServer` on :8110: the
 * controlled month grid, month-change and selection round-trips, event markers,
 * the in-page add/remove event flow, and roving-tabindex keyboard navigation.
 */
import { expect, test, type Page } from '@playwright/test';
import { openRoute } from './helpers';

test.setTimeout(120_000);

const GRID = '[data-testid="calendar-grid"]';
const DAY = `${GRID} .dcf-calendar__day`;
const IN_MONTH_DAY = `${GRID} .dcf-calendar__day:not(.dcf-calendar__day--outside)`;
const SELECTED_DATE = '[data-testid="calendar-selected-date"]';
const LAST_EVENT = '[data-testid="calendar-last-event"]';

function toDateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  return toDateKey(new Date(year, month - 1, day + days));
}

function day(page: Page, key: string) {
  return page.locator(`${GRID} [data-calendar-date="${key}"]`);
}

test.describe('Calendar feature page', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 1000 });
    await openRoute(page, '/calendar', GRID);
  });

  test('renders a fixed six-week grid with headers, today and event markers', async ({
    page,
  }) => {
    await expect(page.locator(`${GRID} [role="columnheader"]`)).toHaveCount(7);
    await expect(page.locator(DAY)).toHaveCount(42);
    await expect(page.locator(`${GRID} .dcf-calendar__week`)).toHaveCount(6);
    await expect(page.locator(`${GRID} .dcf-calendar__title`)).not.toBeEmpty();

    await expect(page.locator(`${GRID} [aria-current="date"]`)).toHaveCount(1);
    await expect(page.locator(`${GRID} .dcf-calendar__day--selected`)).toHaveCount(
      1
    );
    await expect(page.locator(SELECTED_DATE)).toHaveAttribute(
      'datetime',
      await page
        .locator(`${GRID} .dcf-calendar__day--selected`)
        .getAttribute('data-calendar-date') as string
    );
    await expect(page.locator(`${GRID} .dcf-calendar__marker`).first()).toBeVisible();

    // Exactly one day participates in the tab order.
    await expect(page.locator(`${GRID} [role="gridcell"][tabindex="0"]`)).toHaveCount(
      1
    );
  });

  test('next/previous emit monthChange and the host re-renders the heading', async ({
    page,
  }) => {
    const title = page.locator(`${GRID} .dcf-calendar__title`);
    const initial = (await title.innerText()).trim();

    await page.locator(`${GRID} [data-calendar-nav="next"]`).click();
    await expect(page.locator(LAST_EVENT)).toContainText('monthChange:');
    await expect(page.locator(LAST_EVENT)).toContainText('(next)');
    await expect(title).not.toHaveText(initial);

    await page.locator(`${GRID} [data-calendar-nav="previous"]`).click();
    await expect(page.locator(LAST_EVENT)).toContainText('(previous)');
    await expect(title).toHaveText(initial);

    await page.locator(`${GRID} [data-calendar-nav="next"]`).click();
    await page.locator('[data-testid="calendar-reset"]').click();
    await expect(title).toHaveText(initial);
    await expect(page.locator(LAST_EVENT)).toContainText('No calendar event yet');
  });

  test('selecting a day emits dateSelected and updates the selected-date panel', async ({
    page,
  }) => {
    const target = page.locator(IN_MONTH_DAY).nth(14);
    const key = (await target.getAttribute('data-calendar-date')) as string;

    await target.click();

    await expect(page.locator(LAST_EVENT)).toContainText(`dateSelected: ${key}`);
    await expect(page.locator(SELECTED_DATE)).toHaveAttribute('datetime', key);
    await expect(
      page.locator(`${GRID} [data-calendar-date="${key}"]`)
    ).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(`${GRID} .dcf-calendar__day--selected`)).toHaveCount(1);
  });

  test('adds a marker/event to the selected date and removes it again', async ({
    page,
  }) => {
    const selected = page.locator(`${GRID} .dcf-calendar__day--selected`);
    const selectedKey = (await selected.getAttribute(
      'data-calendar-date'
    )) as string;
    const list = page.locator('[data-testid="calendar-event-list"]');

    await expect(list).toContainText('Design review');
    await expect(selected.locator('.dcf-calendar__marker')).toHaveCount(1);

    await page.locator('[data-testid="calendar-event-title"]').fill(
      'Coverage event'
    );
    await page.locator('[data-testid="calendar-event-color"]').selectOption(
      '#16a34a'
    );
    await page.locator('[data-testid="calendar-add-event"]').click();

    await expect(page.locator(LAST_EVENT)).toContainText(
      'eventAdded: Coverage event'
    );
    await expect(list).toContainText('Coverage event');
    await expect(page.locator('[data-testid="calendar-event-title"]')).toHaveValue(
      ''
    );
    await expect(
      page.locator(`${GRID} [data-calendar-date="${selectedKey}"] .dcf-calendar__marker`)
    ).toHaveCount(2);

    await page
      .getByRole('button', { name: 'Remove Coverage event' })
      .click();

    await expect(page.locator(LAST_EVENT)).toContainText(
      'eventRemoved: Coverage event'
    );
    await expect(list).not.toContainText('Coverage event');
    await expect(list).toContainText('Design review');
    await expect(
      page.locator(`${GRID} [data-calendar-date="${selectedKey}"] .dcf-calendar__marker`)
    ).toHaveCount(1);
  });

  test('roving tabindex moves focus across days with the keyboard', async ({
    page,
  }) => {
    const start = page.locator(IN_MONTH_DAY).nth(14);
    const startKey = (await start.getAttribute('data-calendar-date')) as string;
    await start.click();

    await day(page, startKey).focus();
    await expect(day(page, startKey)).toBeFocused();

    const rightKey = addDays(startKey, 1);
    await page.keyboard.press('ArrowRight');
    await expect(day(page, rightKey)).toBeFocused();
    await expect(day(page, rightKey)).toHaveAttribute('tabindex', '0');
    await expect(page.locator(`${GRID} [role="gridcell"][tabindex="0"]`)).toHaveCount(
      1
    );

    const downKey = addDays(rightKey, 7);
    await page.keyboard.press('ArrowDown');
    await expect(day(page, downKey)).toBeFocused();
    await expect(day(page, downKey)).toHaveAttribute('tabindex', '0');

    // Home/End move within the rendered week.
    await page.keyboard.press('Home');
    await expect(page.locator(`${GRID} [role="gridcell"][tabindex="0"]`)).toHaveCount(
      1
    );
    await page.keyboard.press('End');
    await expect(page.locator(`${GRID} [role="gridcell"][tabindex="0"]`)).toHaveCount(
      1
    );
  });
});
