/**
 * @module module:lib/components/storyboard-tutorial/storyboard-tutorial.completion.spec
 * @description Unit spec for the storyboard tutorial completion resolver and the
 * DOM-aware user-action detector.
 * @summary Covers the scenario/step completion merge and each detected interaction
 * (click, drag, input, keys), selector scoping, host exclusion, teardown and the
 * unsupported-action guard.
 */

import { BadRequestError } from '@decaf-ts/db-decorators';
import {
  resolveTutorialCompletion,
  StoryboardTutorialActionDetector,
  TutorialActionContext,
} from './storyboard-tutorial.completion';
import type {
  StoryboardTutorialControls,
  StoryboardTutorialStep,
  TutorialActionDetection,
} from './storyboard-tutorial.types';

type Ctx = Record<string, unknown>;

function makeElement(tag: string, id: string): HTMLElement {
  const element = document.createElement(tag);
  element.id = id;
  document.body.appendChild(element);
  return element;
}

function makeContext(
  config: TutorialActionDetection,
  options: { step?: StoryboardTutorialStep<Ctx>; root?: HTMLElement } = {}
): { context: TutorialActionContext<Ctx>; complete: jest.Mock; root: HTMLElement } {
  const root = options.root ?? makeElement('div', `root-${Math.random().toString(36).slice(2)}`);
  const complete = jest.fn().mockResolvedValue(true);
  const controls = { complete } as unknown as StoryboardTutorialControls<Ctx>;
  return {
    root,
    complete,
    context: {
      step: options.step ?? { id: 's1' },
      config,
      controls,
      root,
      document,
    },
  };
}

function click(target: EventTarget, init: MouseEventInit = {}): void {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, ...init }));
}

describe('resolveTutorialCompletion', () => {
  it('returns undefined when neither the scenario nor the step configures completion', () => {
    expect(resolveTutorialCompletion({ id: 's1' }, { id: 'scenario', steps: [] })).toBeUndefined();
  });

  it('inherits the scenario default and merges per-step overrides field by field', () => {
    const resolved = resolveTutorialCompletion(
      { id: 's1', completion: { timeout: 5000 } },
      { id: 'scenario', steps: [], completion: { minTime: 1000, action: { type: 'click' } } }
    );

    expect(resolved).toEqual({ minTime: 1000, timeout: 5000, action: { type: 'click' } });
  });

  it('lets a step override the scenario action', () => {
    const resolved = resolveTutorialCompletion(
      { id: 's1', completion: { action: { type: 'keys', keys: 'Enter' } } },
      { id: 'scenario', steps: [], completion: { action: { type: 'click' } } }
    );

    expect(resolved?.action).toEqual({ type: 'keys', keys: 'Enter' });
  });

  it('disables the scenario default with a step-level false', () => {
    const resolved = resolveTutorialCompletion(
      { id: 's1', completion: false },
      { id: 'scenario', steps: [], completion: { timeout: 1000 } }
    );

    expect(resolved).toBeUndefined();
  });
});

describe('StoryboardTutorialActionDetector', () => {
  afterEach(() => {
    document.querySelectorAll('[id^="action-"], [id^="root-"]').forEach((element) => element.remove());
  });

  it('completes on a click that matches the selector', () => {
    const target = makeElement('button', 'action-click');
    const { context, complete } = makeContext({ type: 'click', selector: '#action-click' });
    const detector = new StoryboardTutorialActionDetector<Ctx>();

    detector.arm(context);
    click(target);

    expect(complete).toHaveBeenCalledWith('action');
  });

  it('ignores a click outside the selector', () => {
    const target = makeElement('button', 'action-click-outside');
    const { context, complete } = makeContext({ type: 'click', selector: '#action-click-other' });
    const detector = new StoryboardTutorialActionDetector<Ctx>();

    detector.arm(context);
    click(target);

    expect(complete).not.toHaveBeenCalled();
  });

  it('ignores clicks from a non-primary button when a button is configured', () => {
    const target = makeElement('button', 'action-click-button');
    const { context, complete } = makeContext({
      type: 'click',
      selector: '#action-click-button',
      button: 0,
    });
    const detector = new StoryboardTutorialActionDetector<Ctx>();

    detector.arm(context);
    click(target, { button: 2 });

    expect(complete).not.toHaveBeenCalled();
  });

  it('completes on typed input that reaches the minimum length', () => {
    const input = makeElement('input', 'action-input') as HTMLInputElement;
    const { context, complete } = makeContext({
      type: 'input',
      selector: '#action-input',
      minLength: 3,
    });
    const detector = new StoryboardTutorialActionDetector<Ctx>();

    detector.arm(context);
    input.value = 'ab';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(complete).not.toHaveBeenCalled();

    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(complete).toHaveBeenCalledWith('action');
  });

  it('completes on a configured key press', () => {
    const target = makeElement('input', 'action-keys');
    const { context, complete } = makeContext({
      type: 'keys',
      selector: '#action-keys',
      keys: ['Enter', ' '],
    });
    const detector = new StoryboardTutorialActionDetector<Ctx>();

    detector.arm(context);
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(complete).not.toHaveBeenCalled();

    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'enter', bubbles: true }));
    expect(complete).toHaveBeenCalledWith('action');
  });

  it('completes on any key when no keys are configured', () => {
    const target = makeElement('input', 'action-any-key');
    const { context, complete } = makeContext({ type: 'keys', selector: '#action-any-key' });
    const detector = new StoryboardTutorialActionDetector<Ctx>();

    detector.arm(context);
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(complete).toHaveBeenCalledWith('action');
  });

  it('completes on a drag that passes the distance threshold', () => {
    const target = makeElement('div', 'action-drag');
    const { context, complete } = makeContext({
      type: 'drag',
      selector: '#action-drag',
      threshold: 20,
    });
    const detector = new StoryboardTutorialActionDetector<Ctx>();

    detector.arm(context);
    target.dispatchEvent(new MouseEvent('mousedown', { clientX: 0, clientY: 0, bubbles: true }));
    target.dispatchEvent(new MouseEvent('mouseup', { clientX: 5, clientY: 0, bubbles: true }));
    expect(complete).not.toHaveBeenCalled();

    target.dispatchEvent(new MouseEvent('mousedown', { clientX: 0, clientY: 0, bubbles: true }));
    target.dispatchEvent(new MouseEvent('mouseup', { clientX: 30, clientY: 0, bubbles: true }));
    expect(complete).toHaveBeenCalledWith('action');
  });

  it('matches any non-host target when no selector is configured', () => {
    const { context, complete, root } = makeContext({ type: 'click' });
    const outside = makeElement('button', 'action-anywhere');
    const inside = document.createElement('button');
    root.appendChild(inside);
    const detector = new StoryboardTutorialActionDetector<Ctx>();

    detector.arm(context);
    click(inside);
    expect(complete).not.toHaveBeenCalled();

    click(outside);
    expect(complete).toHaveBeenCalledWith('action');
  });

  it('removes listeners on disarm so later interactions do not complete', () => {
    const target = makeElement('button', 'action-disarm');
    const { context, complete } = makeContext({ type: 'click', selector: '#action-disarm' });
    const detector = new StoryboardTutorialActionDetector<Ctx>();

    detector.arm(context);
    detector.disarm();
    click(target);

    expect(complete).not.toHaveBeenCalled();
  });

  it('does not duplicate listeners when armed repeatedly', () => {
    const target = makeElement('button', 'action-rearm');
    const { context, complete } = makeContext({ type: 'click', selector: '#action-rearm' });
    const detector = new StoryboardTutorialActionDetector<Ctx>();

    detector.arm(context);
    detector.arm(context);
    click(target);

    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('rejects an unsupported action type', () => {
    const { context } = makeContext({ type: 'swipe' as TutorialActionDetection['type'] });
    const detector = new StoryboardTutorialActionDetector<Ctx>();

    expect(() => detector.arm(context)).toThrow(BadRequestError);
  });
});
