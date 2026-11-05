/**
 * @module for-angular/app/pages/math/math.page.spec
 * @summary SAA-1473 `/math` demo page contract.
 * @description Proves the page evaluates the bound LaTeX through the compute
 * engine, including symbolic expressions and numeric examples, and that the
 * empty and cleared states are distinguished from a successful evaluation.
 */
import type { Signal, WritableSignal } from '@angular/core';
import { MathPage } from './math.page';

interface MathEvaluation {
  state: 'empty' | 'ok' | 'error';
  result?: string;
}

interface MathExample {
  id: string;
  labelKey: string;
  latex: string;
}

interface MathPageInternals {
  examples: MathExample[];
  value: WritableSignal<string>;
  evaluation: Signal<MathEvaluation>;
  applyExample(example: MathExample): void;
  clear(): void;
}

function createPage(): MathPageInternals {
  return new MathPage() as unknown as MathPageInternals;
}

describe('MathPage — LaTeX evaluation (SAA-1473)', () => {
  it('evaluates the default expression symbolically', () => {
    const page = createPage();

    expect(page.value()).toBe('\\frac{1}{2} x^{2} + 3');
    const evaluation = page.evaluation();
    expect(evaluation.state).toBe('ok');
    expect(evaluation.result).toContain('x');
  });

  it('evaluates the fraction example to a numeric result', () => {
    const page = createPage();

    const fraction = page.examples.find((example) => example.id === 'fraction');
    expect(fraction).toBeDefined();
    page.applyExample(fraction as MathExample);

    const evaluation = page.evaluation();
    expect(evaluation.state).toBe('ok');
    expect(evaluation.result).toBe('0.875');
  });

  it('evaluates the polynomial example', () => {
    const page = createPage();

    const quadratic = page.examples.find(
      (example) => example.id === 'quadratic'
    );
    page.applyExample(quadratic as MathExample);

    expect(page.evaluation().state).toBe('ok');
    expect(page.evaluation().result).toContain('x');
  });

  it('evaluates the definite integral example to a numeric result', () => {
    const page = createPage();

    const integral = page.examples.find((example) => example.id === 'integral');
    page.applyExample(integral as MathExample);

    const evaluation = page.evaluation();
    expect(evaluation.state).toBe('ok');
    expect(Number(evaluation.result)).toBeCloseTo(1 / 3, 6);
  });

  it('reports malformed LaTeX as the error state (SAA-1483 D3)', () => {
    const page = createPage();

    page.value.set('\\frac{1}{');

    expect(page.evaluation()).toEqual({ state: 'error' });

    page.value.set('x^{2} + ');
    expect(page.evaluation()).toEqual({ state: 'error' });
  });

  it('keeps valid LaTeX in the ok state (SAA-1483 D3)', () => {
    const page = createPage();

    page.value.set('\\frac{1}{2}');

    expect(page.evaluation()).toEqual({ state: 'ok', result: '0.5' });
  });

  it('reports the empty state when the value is blank', () => {
    const page = createPage();

    page.clear();

    expect(page.value()).toBe('');
    expect(page.evaluation()).toEqual({ state: 'empty' });
  });
});
