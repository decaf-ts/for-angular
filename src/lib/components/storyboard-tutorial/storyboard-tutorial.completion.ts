/**
 * @module module:lib/components/storyboard-tutorial/storyboard-tutorial.completion
 * @description Pluggable step-completion support for the storyboard tutorial.
 * @summary Resolves the per-step completion policy (timeout, minimum time and
 * expected user action) from the scenario default and the step override, and
 * provides the DOM-aware {@link StoryboardTutorialActionDetector} that observes the
 * declared interaction within the step's whitelist/blocking overlay semantics and
 * drives the engine's completion trigger.
 */

import { BadRequestError } from '@decaf-ts/db-decorators';
import {
  DEFAULT_TUTORIAL_DRAG_THRESHOLD,
  DEFAULT_TUTORIAL_INPUT_LENGTH,
} from './storyboard-tutorial.types';
import type {
  StoryboardTutorialControls,
  StoryboardTutorialScenario,
  StoryboardTutorialStep,
  TutorialActionDetection,
  TutorialCompletionConfig,
  TutorialContext,
} from './storyboard-tutorial.types';

/**
 * @description Resolves the effective completion policy for a step.
 * @summary A step may override the scenario default field by field, so a step can
 * add an action or a timeout without losing the scenario's `minTime`. A step-level
 * `completion: false` disables the scenario default for that step only.
 * @param step the active step.
 * @param scenario the running scenario, when there is one.
 * @returns the merged completion policy, or undefined when none applies.
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.completion
 */
export function resolveTutorialCompletion<C extends TutorialContext = TutorialContext>(
  step: StoryboardTutorialStep<C>,
  scenario?: StoryboardTutorialScenario<C>
): TutorialCompletionConfig | undefined {
  if (step.completion === false) return undefined;
  const base = scenario?.completion;
  const override = step.completion;
  if (!base && !override) return undefined;
  return {
    ...(base ?? {}),
    ...(override ?? {}),
    action: override?.action ?? base?.action,
  };
}

/**
 * @description Context handed to the action detector when a step is armed.
 * @interface TutorialActionContext
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.completion
 */
export interface TutorialActionContext<C extends TutorialContext = TutorialContext> {
  /** The active step declaring the expected interaction. */
  step: StoryboardTutorialStep<C>;
  /** The resolved action detection config. */
  config: TutorialActionDetection;
  /** Engine controls the detector drives on completion. */
  controls: StoryboardTutorialControls<C>;
  /** The tutorial host element; interactions inside it never complete the step. */
  root: HTMLElement;
  /** The document the listeners are attached to. */
  document: Document;
}

/**
 * @description Detects a step's declared user interaction and completes the step.
 * @summary DOM-aware but framework-agnostic. `arm` attaches capture-phase
 * listeners for the configured interaction (`click`, `drag`, `input` or `keys`) scoped
 * to the resolved selectors, so detection respects the same whitelist/blocking overlay
 * semantics as the rest of the tutorial: only whitelisted (or explicitly selected)
 * elements count and the tutorial host is ignored. `disarm` removes every listener, so a
 * step change, abort, end or route navigation tears the detection down without leaks.
 * Completion is delegated to `controls.complete('action')`, which is idempotent and
 * honours the step's `minTime` floor, so a detection can never double-advance.
 * @class StoryboardTutorialActionDetector
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.completion
 */
export class StoryboardTutorialActionDetector<C extends TutorialContext = TutorialContext> {
  /** Strategy name, surfaced for diagnostics and tests. */
  readonly name: string = 'action';

  /** The document listeners are attached to, when armed. */
  private document?: Document;

  /** Attached listeners, kept so `disarm` can remove them all. */
  private listeners: { type: string; handler: EventListener }[] = [];

  /** Pointer origin captured on `mousedown` while detecting a drag. */
  private dragStart: { x: number; y: number } | null = null;

  /**
   * @description Arms detection for the active step's expected interaction.
   * @param context the action detection context.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.completion
   */
  arm(context: TutorialActionContext<C>): void {
    this.disarm();
    const { config, controls, root, document } = context;
    this.document = document;
    const selectors = this.resolveSelectors(context);
    const complete = (): void => {
      void controls.complete('action');
    };

    switch (config.type) {
      case 'click':
        this.listen('click', (event) => {
          if (config.button !== undefined && (event as MouseEvent).button !== config.button) return;
          if (this.matches(event, selectors, root)) complete();
        });
        break;
      case 'input':
        this.listen('input', (event) => {
          if (!this.matches(event, selectors, root)) return;
          const value = (event.target as HTMLInputElement | null)?.value ?? '';
          if (value.length >= (config.minLength ?? DEFAULT_TUTORIAL_INPUT_LENGTH)) complete();
        });
        break;
      case 'keys':
        this.listen('keydown', (event) => {
          if (!this.matches(event, selectors, root)) return;
          if (!this.matchesKeys(config.keys, (event as KeyboardEvent).key)) return;
          complete();
        });
        break;
      case 'drag':
        this.armDrag(config, selectors, root, complete);
        break;
      default:
        throw new BadRequestError(
          `Unsupported storyboard tutorial action "${String((config as { type?: string }).type)}"`
        );
    }
  }

  /**
   * @description Removes every listener attached by {@link arm}.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.completion
   */
  disarm(): void {
    const document = this.document;
    if (document) {
      this.listeners.forEach(({ type, handler }) =>
        document.removeEventListener(type, handler, true)
      );
    }
    this.listeners = [];
    this.document = undefined;
    this.dragStart = null;
  }

  /**
   * @description Attaches drag detection through a mousedown/mouseup distance check.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.completion
   */
  private armDrag(
    config: TutorialActionDetection,
    selectors: string[],
    root: HTMLElement,
    complete: () => void
  ): void {
    const threshold = config.threshold ?? DEFAULT_TUTORIAL_DRAG_THRESHOLD;
    this.listen('mousedown', (event) => {
      const mouse = event as MouseEvent;
      this.dragStart = this.matches(event, selectors, root)
        ? { x: mouse.clientX, y: mouse.clientY }
        : null;
    });
    this.listen('mouseup', (event) => {
      const mouse = event as MouseEvent;
      const start = this.dragStart;
      this.dragStart = null;
      if (!start || !this.matches(event, selectors, root)) return;
      if (Math.hypot(mouse.clientX - start.x, mouse.clientY - start.y) >= threshold) complete();
    });
  }

  /**
   * @description Resolves the selectors an interaction must target.
   * @summary Prefers the action's own selector, then the step's whitelist, then the
   * step's message target; an empty list means any interaction outside the host.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.completion
   */
  private resolveSelectors(context: TutorialActionContext<C>): string[] {
    const { config, step } = context;
    if (config.selector) return [config.selector];
    if (step.whitelist?.length) return step.whitelist;
    if (step.target) return [step.target];
    return [];
  }

  /**
   * @description Checks whether an event targets a whitelisted/selected element.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.completion
   */
  private matches(event: Event, selectors: string[], root: HTMLElement): boolean {
    const target = event.target;
    if (!(target instanceof Element)) return false;
    if (root.contains(target)) return false;
    if (!selectors.length) return true;
    return selectors.some((selector) => !!target.closest(selector));
  }

  /**
   * @description Checks whether a keyboard event matches the configured key(s).
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.completion
   */
  private matchesKeys(keys: string | string[] | undefined, pressed: string): boolean {
    if (!keys) return true;
    const list = Array.isArray(keys) ? keys : [keys];
    return list.some((key) => key.toLowerCase() === pressed.toLowerCase());
  }

  /**
   * @description Attaches a capture-phase document listener.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.completion
   */
  private listen(type: string, handler: EventListener): void {
    const document = this.document;
    if (!document) return;
    document.addEventListener(type, handler, true);
    this.listeners.push({ type, handler });
  }
}
