/**
 * SAA-1045 — Playwright functional and accessibility verification for `/gantt`.
 * Runs against the static Storybook build of the real vendor renderer.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const STORY = (id: string): string => `/iframe.html?id=${id}&viewMode=story`;

interface RecordedEvent {
  kind: string;
  [key: string]: unknown;
}

function bar(page: Page, taskId: string) {
  return page.locator(`.gantt-bar-content[data-gantt-task-id="${taskId}"]`);
}

async function openStory(page: Page, id: string): Promise<void> {
  await page.goto(STORY(id));
  await page.locator('.dcf-gantt').waitFor({ state: 'attached' });
}

async function openRendered(page: Page, id = 'tests-gantt-verification--verification'): Promise<void> {
  await openStory(page, id);
  await page.locator('.gantt-bar-content').first().waitFor({ state: 'visible' });
}

async function events(page: Page): Promise<RecordedEvent[]> {
  const text =
    (await page.locator('[data-gantt-events]').textContent())?.trim() || '[]';
  return JSON.parse(text) as RecordedEvent[];
}

async function last(page: Page, kind: string): Promise<RecordedEvent | undefined> {
  return (await events(page)).filter((event) => event.kind === kind).at(-1);
}

async function waitForCount(
  page: Page,
  kind: string,
  count: number
): Promise<RecordedEvent> {
  await expect
    .poll(
      async () =>
        (await events(page)).filter((event) => event.kind === kind).length,
      { timeout: 10_000 }
    )
    .toBeGreaterThanOrEqual(count);
  const matching = (await events(page)).filter((event) => event.kind === kind);
  return matching[count - 1];
}

test.describe('Gantt rendering', () => {
  test('renders bars with titles and progress, and a diamond milestone', async ({ page }) => {
    await openRendered(page);

    await expect(bar(page, 'a')).toBeVisible();
    await expect(bar(page, 'b')).toBeVisible();
    await expect(bar(page, 'a')).toContainText('Alpha');
    await expect(bar(page, 'b')).toContainText('Bravo');
    await expect(
      page.locator('.dcf-gantt__table-progress', { hasText: '40%' })
    ).toBeVisible();
    await expect(page.locator('.dcf-gantt__table-progress', { hasText: '20%' })).toBeVisible();

    const milestoneMarker = page.locator(
      '[data-gantt-task-id="m"].dcf-gantt__bar-marker, [data-gantt-task-id="m"] .dcf-gantt__bar-marker--milestone'
    );
    await expect(milestoneMarker).toHaveCount(1);
    const milestone = milestoneMarker.first();
    await expect(milestone).toHaveClass(/dcf-gantt__bar-marker--milestone/);
    const markerStyle = await milestone.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        width: style.width,
        height: style.height,
        transform: style.transform,
      };
    });
    expect(markerStyle.width).toBe('12px');
    expect(markerStyle.height).toBe('12px');
    expect(markerStyle.transform).not.toBe('none');

    const milestoneBar = page.locator('.gantt-bar', {
      has: page.locator('[data-gantt-task-id="m"]'),
    });
    const background = await milestoneBar.evaluate(
      (element) => getComputedStyle(element).backgroundColor
    );
    expect(['rgba(0, 0, 0, 0)', 'transparent']).toContain(background);
    await expect(
      milestoneBar.locator('.gantt-bar-content-progress')
    ).toBeHidden();
  });

  test('renders the English calendar header', async ({ page }) => {
    await openRendered(page);
    const header = page.locator('.gantt-calendar-header');
    await expect(header).toBeVisible();
    await expect(header).toContainText('40th');
    await expect(header).toContainText('2026');
    await expect(header).not.toContainText('第');
    await expect(header).not.toContainText('年');
  });

  test('renders dependency links from predecessor to successor in a valid color', async ({ page }) => {
    await openRendered(page);

    const links = page.locator(
      'svg.gantt-links-overlay-main path[stroke]:not([stroke="transparent"])'
    );
    await expect(links).toHaveCount(1);
    const link = links.first();
    await expect(link).toHaveAttribute('stroke', /^#/);
    const stroke = await link.getAttribute('stroke');
    expect(stroke?.toLowerCase()).not.toBe('#ff7575');

    const [aBox, bBox, linkBox] = await Promise.all([
      bar(page, 'a').boundingBox(),
      bar(page, 'b').boundingBox(),
      link.boundingBox(),
    ]);
    expect(aBox && bBox && linkBox).toBeTruthy();
    expect(linkBox!.x).toBeGreaterThanOrEqual(aBox!.x + aBox!.width - 40);
    expect(linkBox!.x + linkBox!.width).toBeLessThanOrEqual(bBox!.x + 60);
  });

  test('renders all eight Components/Gantt stories without the readOnly shadowing defect', async ({ page }) => {
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        failures.push(`console: ${message.text()}`);
      }
    });

    await openStory(page, 'components-gantt--default');
    await expect(page.locator('.gantt-bar-content')).toHaveCount(6);

    for (const id of [
      'components-gantt--default',
      'components-gantt--empty',
      'components-gantt--read-only',
      'components-gantt--disabled',
      'components-gantt--loading',
      'components-gantt--error-state',
      'components-gantt--milestones',
      'components-gantt--dependencies',
    ]) {
      await openStory(page, id);
      await expect(page.locator('.dcf-gantt')).toBeAttached();
    }

    await openStory(page, 'components-gantt--empty');
    await expect(page.locator('.dcf-gantt__state--empty')).toBeVisible();
    await openStory(page, 'components-gantt--loading');
    await expect(page.locator('.dcf-gantt__state--loading')).toBeVisible();
    await openStory(page, 'components-gantt--error-state');
    await expect(page.locator('.dcf-gantt__state--error')).toBeVisible();
    for (const id of [
      'components-gantt--read-only',
      'components-gantt--disabled',
      'components-gantt--milestones',
      'components-gantt--dependencies',
    ]) {
      await openStory(page, id);
      await expect(page.locator('.gantt-bar-content')).not.toHaveCount(0);
    }

    expect(failures.filter((message) => /readOnly is not a function/.test(message))).toEqual([]);
    expect(failures).toEqual([]);
  });

  test('renders every state: empty, loading, disabled, readOnly, and error with retry', async ({ page }) => {
    await openStory(page, 'components-gantt--empty');
    await expect(page.locator('.dcf-gantt__state--empty')).toContainText(
      'This project has no scheduled tasks yet.'
    );

    await openStory(page, 'components-gantt--loading');
    await expect(page.locator('.dcf-gantt__state--loading')).toBeVisible();
    await expect(page.locator('ngx-gantt')).toHaveCount(0);

    await openStory(page, 'components-gantt--disabled');
    await expect(page.locator('.dcf-gantt--disabled')).toBeVisible();

    await openStory(page, 'components-gantt--read-only');
    await expect(page.locator('.dcf-gantt--readonly')).toBeVisible();

    await openStory(page, 'tests-gantt-verification--verification-error');
    await expect(page.locator('.dcf-gantt__state--error')).toHaveAttribute(
      'role',
      'alert'
    );
    await page.locator('.dcf-gantt__retry').click();
    expect(await waitForCount(page, 'retry-requested', 1)).toMatchObject({
      kind: 'retry-requested',
    });
  });
});

test.describe('Gantt interactions', () => {
  test('keyboard move, resize, progress, selection, and edit emit accepted events', async ({ page }) => {
    await openRendered(page);

    await bar(page, 'b').focus();
    await page.keyboard.press('Alt+ArrowRight');
    const moved = await waitForCount(page, 'date-changed', 1);
    expect(moved).toMatchObject({
      taskId: 'b',
      reason: 'keyboard',
      mode: 'move',
      startDate: '2026-10-06',
      endDate: '2026-10-09',
      startIsDate: true,
      endIsDate: true,
    });

    await bar(page, 'b').focus();
    await page.keyboard.press('Alt+Shift+ArrowRight');
    const resized = await waitForCount(page, 'date-changed', 2);
    expect(resized).toMatchObject({
      taskId: 'b',
      reason: 'keyboard',
      mode: 'resize',
      startDate: '2026-10-06',
      endDate: '2026-10-10',
    });

    await bar(page, 'b').focus();
    await page.keyboard.press(']');
    expect(await waitForCount(page, 'progress-changed', 1)).toMatchObject({
      taskId: 'b',
      previous: 0.4,
      current: 0.5,
      reason: 'keyboard',
    });
    await bar(page, 'b').focus();
    await page.keyboard.press('[');
    expect(await waitForCount(page, 'progress-changed', 2)).toMatchObject({
      taskId: 'b',
      previous: 0.5,
      current: 0.4,
    });

    await bar(page, 'a').focus();
    await page.keyboard.press('Enter');
    await bar(page, 'a').focus();
    await page.keyboard.press('Space');
    await bar(page, 'a').focus();
    await page.keyboard.press('e');
    await waitForCount(page, 'selected', 2);
    const selections = (await events(page)).filter(
      (event) => event.kind === 'selected'
    );
    expect(selections.map((event) => event.taskId)).toEqual(['a', 'a']);
    expect(await waitForCount(page, 'edit-requested', 1)).toMatchObject({
      taskId: 'a',
    });
  });

  test('rejects a reversed dependency and snaps the bar back', async ({ page }) => {
    await openRendered(page);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await bar(page, 'b').focus();
      await page.keyboard.press('Alt+ArrowLeft');
    }
    await expect(bar(page, 'b')).toBeVisible();
    await waitForCount(page, 'date-changed', 2);
    const beforeRejection = await bar(page, 'b').boundingBox();

    await bar(page, 'b').focus();
    await page.keyboard.press('Alt+ArrowLeft');

    expect(await waitForCount(page, 'date-rejected', 1)).toMatchObject({
      taskId: 'b',
      reason: 'dependency-violation',
      dependencyId: 'a',
    });
    const afterRejection = await bar(page, 'b').boundingBox();
    expect(afterRejection?.x).toBeCloseTo(beforeRejection!.x, 0);
    expect(afterRejection?.width).toBeCloseTo(beforeRejection!.width, 0);
  });

  test('drags a bar, emitting a move drag event with Date values', async ({ page }) => {
    await openRendered(page);
    const target = bar(page, 'b');
    const box = await target.boundingBox();
    expect(box).toBeTruthy();

    const grabX = box!.x + box!.width * 0.25;
    await page.mouse.move(grabX, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(grabX + 60, box!.y + box!.height / 2, {
      steps: 8,
    });
    await page.mouse.up();

    const dragged = await waitForCount(page, 'date-changed', 1);
    expect(dragged).toMatchObject({
      taskId: 'b',
      reason: 'drag',
      mode: 'move',
      startIsDate: true,
      endIsDate: true,
    });
  });

  test('resizes a bar from its trailing handle', async ({ page }) => {
    await openRendered(page);
    const target = bar(page, 'b');
    expect(await target.boundingBox()).toBeTruthy();

    // The vendor only reveals the drag-handle layer while the bar is active.
    await target.hover();
    const handle = page
      .locator('.gantt-bar', { has: target })
      .locator('.drag-handles .handle')
      .last();
    await expect(handle).toBeVisible();
    const handleBox = await handle.boundingBox();
    expect(handleBox).toBeTruthy();

    const startX = handleBox!.x + handleBox!.width / 2;
    const y = handleBox!.y + handleBox!.height / 2;
    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(startX + 60, y, {
      steps: 8,
    });
    await page.mouse.up();

    const resized = await waitForCount(page, 'date-changed', 1);
    expect(resized).toMatchObject({
      taskId: 'b',
      reason: 'drag',
      mode: 'resize',
      startIsDate: true,
      endIsDate: true,
    });
  });

  test('rejects edits in readOnly, disabled, and loading states', async ({ page }) => {
    await openRendered(page, 'tests-gantt-verification--verification-read-only');
    await bar(page, 'b').focus();
    await page.keyboard.press('Alt+ArrowRight');
    expect(await waitForCount(page, 'date-rejected', 1)).toMatchObject({
      taskId: 'b',
      reason: 'readonly',
    });

    await openRendered(page, 'tests-gantt-verification--verification-disabled');
    await bar(page, 'b').focus();
    await page.keyboard.press('Alt+ArrowRight');
    expect(await waitForCount(page, 'date-rejected', 1)).toMatchObject({
      taskId: 'b',
      reason: 'disabled',
    });

    await openStory(page, 'tests-gantt-verification--verification-loading');
    await expect(page.locator('.dcf-gantt__state--loading')).toBeVisible();
    await expect(page.locator('ngx-gantt')).toHaveCount(0);
  });
});

test.describe('Gantt accessibility', () => {
  test('exposes bar semantics, shortcuts, live announcements, and focus-visible', async ({ page }) => {
    await openRendered(page);
    const target = bar(page, 'b');

    await expect(target).toHaveAttribute('tabindex', '0');
    await expect(target).toHaveAttribute('role', 'button');
    await expect(target).toHaveAttribute('aria-pressed', 'true');
    await expect(target).not.toHaveAttribute('aria-selected');
    await expect(target).toHaveAttribute('aria-disabled', 'false');
    await expect(target).toHaveAttribute(
      'aria-keyshortcuts',
      /Enter Space E Alt\+ArrowLeft Alt\+ArrowRight Alt\+Shift\+ArrowLeft Alt\+Shift\+ArrowRight \[ \]/
    );
    await expect(target).toHaveAttribute('aria-label', /Bravo/);
    await expect(
      page.locator('.dcf-gantt__help')
    ).toHaveAttribute('id', /.+-help/);

    await target.focus();
    await page.keyboard.press('Enter');
    await waitForCount(page, 'selected', 1);
    await expect(
      page.locator('.dcf-gantt__sr-only[role="status"][aria-live="polite"]')
    ).toContainText('Bravo selected');

    const focusVisible = await target.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        matches: element.matches(':focus-visible'),
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
      };
    });
    expect(focusVisible.matches).toBe(true);
    expect(focusVisible.outlineStyle).not.toBe('none');
    expect(parseFloat(focusVisible.outlineWidth)).toBeGreaterThan(0);

    await page.screenshot({
      path: '/tmp/saa1045-gantt-default.png',
      fullPage: true,
    });

    const scan = await new AxeBuilder({ page })
      .include('.dcf-gantt')
      .analyze();
    const severe = scan.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical'
    );
    expect(severe.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);

  });
});
