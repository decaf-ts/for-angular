/**
 * @module module:lib/components/math-input/math-input.component
 * @description Math formula input component.
 * @summary Standalone Angular component wrapping the MathLive `<math-field>`
 * custom element. The field value is bound as a LaTeX string and emitted on
 * input, with no MathLive types leaking through the public component API.
 *
 * @link {@link MathInputComponent}
 */

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  model,
  untracked,
} from '@angular/core';

/**
 * @description Structural subset of the MathLive `<math-field>` custom element.
 * @summary Keeps the component typed without importing MathLive types, so no
 * MathLive symbol leaks through the public component API.
 * @interface MathfieldElementLike
 * @memberOf module:lib/components/math-input/math-input.component
 */
interface MathfieldElementLike {
  /** Current field content as a LaTeX string. */
  value: string;
  /** Placeholder shown when the field is empty. */
  placeholder: string;
  /** Whether the field rejects user edits. */
  readOnly: boolean;
  /** Keyboard policy; the component always pins it to `manual`. */
  mathVirtualKeyboardPolicy?: string;
}

/**
 * @description LaTeX formula input backed by MathLive.
 * @summary Standalone component that lazily loads the MathLive `<math-field>`
 * custom element after the first render and keeps its value bound as a LaTeX
 * string. The `value` model is two-way: external writes are synced into the
 * field and user edits are emitted back through the same model. Because
 * MathLive is imported dynamically, the component degrades gracefully to an
 * inert field in non-browser environments.
 *
 * @mermaid
 * classDiagram
 *   class MathInputComponent {
 *     +string value
 *     +string placeholder
 *     +boolean disabled
 *     +ngAfterViewInit()
 *     +ngOnDestroy()
 *     +onInput(event)
 *   }
 *   MathInputComponent --|> AfterViewInit
 *   MathInputComponent --|> OnDestroy
 *
 * @implements {AfterViewInit}
 * @implements {OnDestroy}
 */
@Component({
  selector: 'decaf-math-input',
  standalone: true,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './math-input.component.html',
  styleUrls: ['./math-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MathInputComponent implements AfterViewInit, OnDestroy {
  /**
   * @description Two-way bound LaTeX formula value.
   * @summary Mirrors the content of the underlying `<math-field>` element.
   * Writing to the model updates the field; editing the field updates the model.
   *
   * @type {string}
   * @default ''
   * @memberOf MathInputComponent
   */
  readonly value = model<string>('');

  /**
   * @description Placeholder shown when the field is empty.
   * @summary Rendered inside the math field until the user types.
   *
   * @type {string}
   * @default ''
   * @memberOf MathInputComponent
   */
  readonly placeholder = input<string>('');

  /**
   * @description Whether the field is read-only.
   * @summary When `true`, the field renders but rejects user edits.
   *
   * @type {boolean}
   * @default false
   * @memberOf MathInputComponent
   */
  readonly disabled = input<boolean>(false);

  /** Reference to the embedded `<math-field>` element, set after the first render. */
  @ViewChild('field', { static: false })
  private field?: ElementRef<MathfieldElementLike>;

  /** Memoized dynamic `import('mathlive')` promise; `null` after teardown. */
  private mathlivePromise: Promise<unknown> | null = null;

  constructor() {
    effect(() => {
      const value = this.value();
      untracked(() => this.syncValue(value));
    });

    effect(() => {
      const placeholder = this.placeholder();
      const disabled = this.disabled();
      untracked(() => this.syncAttributes(placeholder, disabled));
    });
  }

  /**
   * @description Loads MathLive and syncs the initial model state into the field.
   * @summary Runs after the view is initialized; a failed MathLive load leaves
   * the field inert without throwing.
   * @return {Promise<void>} Resolves once the (best-effort) load completes.
   */
  async ngAfterViewInit(): Promise<void> {
    await this.loadMathlive();
    this.syncValue(this.value());
    this.syncAttributes(this.placeholder(), this.disabled());
  }

  /**
   * @description Releases the memoized MathLive load promise.
   * @summary The custom element itself is destroyed with the view.
   * @return {void} Nothing.
   */
  ngOnDestroy(): void {
    this.mathlivePromise = null;
  }

  /**
   * @description Handles the MathLive `input` event.
   * @param {Event} event - The input event.
   */
  onInput(event: Event): void {
    const target = event.target as MathfieldElementLike | null;
    const latex = target && typeof target.value === 'string' ? target.value : '';
    this.value.set(latex);
  }

  /**
   * @description Loads the MathLive bundle at most once per component lifetime.
   * @summary Import failures are swallowed on purpose: MathLive is optional in
   * non-browser environments and the field simply stays inert.
   * @return {Promise<void>} Resolves when the import settles.
   */
  private async loadMathlive(): Promise<void> {
    if (!this.mathlivePromise) {
      this.mathlivePromise = this.importMathlive();
    }
    try {
      await this.mathlivePromise;
    } catch {
      // MathLive is optional in non-browser environments; the field stays inert.
    }
  }

  /**
   * @description Dynamically imports the MathLive bundle.
   * @summary Kept in its own method so test doubles can stub the import.
   * @return {Promise<unknown>} The dynamic `import('mathlive')` promise.
   */
  private async importMathlive(): Promise<unknown> {
    return import('mathlive');
  }

  /**
   * @description Writes a model value into the math field when it differs.
   * @summary Avoids clobbering the cursor position by skipping no-op writes.
   * @param {string} value - LaTeX string to apply.
   * @return {void} Nothing.
   */
  private syncValue(value: string): void {
    const field = this.field?.nativeElement;
    if (!field) {
      return;
    }
    const next = value ?? '';
    if (field.value !== next) {
      field.value = next;
    }
  }

  /**
   * @description Applies placeholder, read-only and keyboard-policy attributes.
   * @summary The virtual keyboard policy is always pinned to `manual` so the
   * on-screen keyboard never steals focus unexpectedly.
   * @param {string} placeholder - Placeholder text for the field.
   * @param {boolean} disabled - Whether the field is read-only.
   * @return {void} Nothing.
   */
  private syncAttributes(placeholder: string, disabled: boolean): void {
    const field = this.field?.nativeElement;
    if (!field) {
      return;
    }
    field.placeholder = placeholder ?? '';
    field.readOnly = disabled;
    field.mathVirtualKeyboardPolicy = 'manual';
  }
}
