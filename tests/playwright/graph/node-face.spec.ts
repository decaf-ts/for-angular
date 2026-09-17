/**
 * @module tests/playwright/graph/node-face.spec
 * @summary Gate-2 P0 #7 (D7) E2E — rendered node face.
 * @description Asserts the canvas node face (D7/G3-24/25) on the running demo:
 * the category accent comes from the manifest display, the title renders, no
 * description renders, and a `catalogue` icon reference renders as a Tabler sprite
 * `<use>`. The `url`/`data:` icon branches and the letter-silhouette fallback
 * cannot be reached from the demo (every demo manifest carries a catalogue icon);
 * they are pinned by `src/graph/components/graph-node-template/
 * graph-node-template.component.spec.ts` instead.
 *
 * RUN REQUIREMENTS: `npm run start` (dev server on :8110).
 */
import { test, expect } from '@playwright/test';
import { gotoGraph, getNodeFace, getNodeArticle } from './helpers';

interface FaceExpectation {
  id: string;
  title: string;
  accent: string;
  sprite: string;
  description: string;
}

const FACES: FaceExpectation[] = [
  {
    id: 'SplitTextCodeNode',
    title: 'Split',
    accent: '#0d9488',
    sprite: 'assets/tabler-sprite.svg#tabler-code',
    description: 'Splits the input text by newlines into an array.',
  },
  {
    id: 'GraphForeachLoopNode',
    title: 'Foreach',
    accent: '#eab308',
    sprite: 'assets/tabler-sprite.svg#tabler-repeat',
    description: '',
  },
  {
    id: 'ResultLogNode',
    title: 'Log Results',
    accent: '#0d9488',
    sprite: 'assets/tabler-sprite.svg#tabler-terminal',
    description: '',
  },
];

test.describe('Graph node face (D7/G3-24..25)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
  });

  for (const face of FACES) {
    test(`${face.id} renders the manifest category accent (${face.accent})`, async ({ page }) => {
      const rendered = await getNodeFace(page, face.id);
      expect(rendered.accent.toLowerCase()).toBe(face.accent);
    });

    test(`${face.id} renders its manifest title`, async ({ page }) => {
      const rendered = await getNodeFace(page, face.id);
      expect(rendered.name).toBe(face.title);
    });

    test(`${face.id} does not render a description`, async ({ page }) => {
      const rendered = await getNodeFace(page, face.id);
      expect(rendered.descriptionCount).toBe(0);
      if (face.description) {
        const text = await getNodeArticle(page, face.id).textContent();
        expect(text ?? '').not.toContain(face.description);
      }
    });

    test(`${face.id} renders its catalogue icon as a sprite <use>`, async ({ page }) => {
      const rendered = await getNodeFace(page, face.id);
      expect(rendered.spriteHref).toBe(face.sprite);
      expect(rendered.imageSrc).toBeNull();
      expect(rendered.fallback).toBeNull();
    });
  }
});
