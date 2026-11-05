/**
 * SAA-1050 — built Storybook verification for `Components/Scrum`.
 *
 * Serves the static build (`dist/storybook/for-angular`) and loads every scrum
 * story in the iframe, asserting the expected region/card state and no console
 * errors.
 */
import { expect, test, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { ARTIFACTS } from './helpers';

test.setTimeout(180_000);

const STORYBOOK_DIR = path.resolve(process.cwd(), 'dist/storybook/for-angular');
const PORT = 6107;
const STORYBOOK_URL = `http://127.0.0.1:${PORT}`;

const EXPECTED_STORIES = [
  'components-scrum--overview',
  'components-scrum--backlog',
  'components-scrum--sprint-board',
  'components-scrum--empty',
  'components-scrum--read-only',
  'components-scrum--loading',
  'components-scrum--error-state',
];

let server: ChildProcess | null = null;

function get(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () => resolve({ status: response.statusCode ?? 0, body }));
      })
      .on('error', reject);
  });
}

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await get(`${STORYBOOK_URL}/index.json`);
      if (response.status === 200) {
        return;
      }
    } catch {
      // still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Storybook static server did not start on ${STORYBOOK_URL}`);
}

function storyUrl(id: string): string {
  return `${STORYBOOK_URL}/iframe.html?id=${id}&viewMode=story`;
}

test.beforeAll(async () => {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  server = spawn(
    'python3',
    ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', STORYBOOK_DIR],
    { stdio: 'ignore' }
  );
  await waitForServer();
});

test.afterAll(async () => {
  server?.kill('SIGTERM');
  server = null;
});

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`${message.text()} @ ${message.location().url}`);
    }
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

async function openStory(page: Page, id: string): Promise<string[]> {
  const errors = collectErrors(page);
  await page.goto(storyUrl(id));
  await expect(page.locator('#storybook-root .dcf-kanban').first()).toBeVisible({
    timeout: 60_000,
  });
  return errors;
}

test('story index contains all 7 Components/Scrum stories', async () => {
  const response = await get(`${STORYBOOK_URL}/index.json`);
  expect(response.status).toBe(200);
  const index = JSON.parse(response.body) as {
    entries: Record<string, { title: string; name: string }>;
  };
  const scrum = Object.entries(index.entries).filter(
    ([, entry]) => entry.title === 'Components/Scrum'
  );
  expect(scrum.map(([id]) => id).sort()).toEqual([...EXPECTED_STORIES].sort());
  expect(scrum).toHaveLength(7);
});

test('Overview story renders 3 backlog + 4 sprint cards without console errors', async ({
  page,
}) => {
  const errors = await openStory(page, 'components-scrum--overview');
  await expect(page.locator('[data-scrum-backlog-task-id]')).toHaveCount(3);
  await expect(
    page.locator('[data-sprint-id="sprint-1"] [data-kanban-task-id]')
  ).toHaveCount(4);
  await expect(page.locator('[data-kanban-task-id]')).toHaveCount(7);
  await page.screenshot({ path: `${ARTIFACTS}/storybook-overview.png`, fullPage: true });
  expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
});

test('Backlog story renders only the 3 backlog cards', async ({ page }) => {
  const errors = await openStory(page, 'components-scrum--backlog');
  await expect(page.locator('[data-scrum-backlog-task-id]')).toHaveCount(3);
  await expect(page.locator('[data-sprint-id]')).toHaveCount(0);
  await page.screenshot({ path: `${ARTIFACTS}/storybook-backlog.png`, fullPage: true });
  expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
});

test('SprintBoard story renders the 4 sprint-1 cards', async ({ page }) => {
  const errors = await openStory(page, 'components-scrum--sprint-board');
  await expect(
    page.locator('[data-sprint-id="sprint-1"] [data-kanban-task-id]')
  ).toHaveCount(4);
  await expect(page.locator('[data-scrum-backlog-task-id]')).toHaveCount(0);
  await page.screenshot({ path: `${ARTIFACTS}/storybook-sprint-board.png`, fullPage: true });
  expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
});

test('Empty story renders the empty state with 0 cards', async ({ page }) => {
  const errors = await openStory(page, 'components-scrum--empty');
  await expect(page.locator('[data-kanban-task-id]')).toHaveCount(0);
  await expect(page.getByText('No backlog tasks')).toBeVisible();
  await expect(page.getByText('No tasks in this sprint')).toHaveCount(4);
  await page.screenshot({ path: `${ARTIFACTS}/storybook-empty.png`, fullPage: true });
  expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
});

test('ReadOnly story renders no drag handles', async ({ page }) => {
  const errors = await openStory(page, 'components-scrum--read-only');
  await expect(page.locator('[data-kanban-task-id]')).toHaveCount(7);
  await expect(page.locator('.dcf-kanban-card__handle')).toHaveCount(0);
  await page.screenshot({ path: `${ARTIFACTS}/storybook-readonly.png`, fullPage: true });
  expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
});

test('Loading story renders the loading state', async ({ page }) => {
  const errors = await openStory(page, 'components-scrum--loading');
  await expect(page.locator('[data-kanban-task-id]')).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Loading backlog...' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Loading sprint...' })).toBeVisible();
  await expect(page.locator('.dcf-kanban')).toHaveCount(2);
  await expect(page.locator('.dcf-kanban').first()).toHaveAttribute('aria-busy', 'true');
  await page.screenshot({ path: `${ARTIFACTS}/storybook-loading.png`, fullPage: true });
  expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
});

test('ErrorState story renders role=alert errors', async ({ page }) => {
  const errors = await openStory(page, 'components-scrum--error-state');
  await expect(page.getByRole('alert')).toHaveCount(2);
  await expect(page.getByRole('alert').first()).toContainText(
    'The sprint could not be loaded. Try again.'
  );
  await expect(page.locator('[data-kanban-task-id]')).toHaveCount(0);
  await page.screenshot({ path: `${ARTIFACTS}/storybook-error.png`, fullPage: true });
  expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
});
