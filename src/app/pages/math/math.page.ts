import { Component, computed, signal } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { ComputeEngine } from '@cortex-js/compute-engine';
import { MathInputComponent } from '@decaf-ts/for-angular/math';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/lib/components';

interface MathEvaluation {
  state: 'empty' | 'ok' | 'error';
  result?: string;
}

interface MathExample {
  id: string;
  labelKey: string;
  latex: string;
}

const DEFAULT_LATEX = '\\frac{1}{2} x^{2} + 3';

const EXAMPLES: MathExample[] = [
  {
    id: 'quadratic',
    labelKey: 'math.example_quadratic',
    latex: 'x^{2} - 4x + 4',
  },
  {
    id: 'fraction',
    labelKey: 'math.example_fraction',
    latex: '\\frac{3}{4} + \\frac{1}{8}',
  },
  {
    id: 'integral',
    labelKey: 'math.example_integral',
    latex: '\\int_0^1 x^{2} \\, dx',
  },
];

/**
 * `/math` demo page: hosts `MathInputComponent` from
 * `@decaf-ts/for-angular/math` and evaluates the entered LaTeX with the Cortex
 * compute engine, offering example formulas and a clear action.
 *
 * @category Demo Pages
 */
@Component({
  selector: 'app-math-page',
  imports: [
    IonContent,
    HeaderComponent,
    ContainerComponent,
    TranslatePipe,
    MathInputComponent,
  ],
  templateUrl: './math.page.html',
  styleUrl: './math.page.scss',
})
export class MathPage {
  protected readonly examples = EXAMPLES;

  protected readonly value = signal(DEFAULT_LATEX);

  private readonly engine = new ComputeEngine();

  protected readonly evaluation = computed<MathEvaluation>(() => {
    const latex = this.value().trim();
    if (!latex) {
      return { state: 'empty' };
    }
    try {
      const parsed = this.engine.parse(latex);
      if (!parsed.isValid) {
        return { state: 'error' };
      }
      const evaluated = parsed.evaluate();
      if (!evaluated.isValid) {
        return { state: 'error' };
      }
      const numeric = evaluated.N().valueOf();
      const result =
        typeof numeric === 'number'
          ? String(numeric)
          : typeof numeric === 'boolean'
            ? String(numeric)
            : evaluated.toString();
      return { state: 'ok', result };
    } catch {
      return { state: 'error' };
    }
  });

  protected applyExample(example: MathExample): void {
    this.value.set(example.latex);
  }

  protected clear(): void {
    this.value.set('');
  }
}
