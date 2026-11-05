/**
 * @module module:lib/components/storyboard-tutorial/storyboard-tutorial.focus
 * @description Built-in pluggable focus/attention strategies.
 * @summary `FadeFocusStrategy` blurs and dims everything outside the
 * whitelisted targets, while `HighlightFocusStrategy` keeps the page readable and
 * draws a highlight border around each target. Both are selected at scenario level
 * and may be overridden per step.
 */

import type {
  TutorialContext,
  TutorialFocusContext,
  TutorialFocusStrategy,
} from './storyboard-tutorial.types';

/**
 * @description CSS class applied to the overlay by the fade strategy.
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.focus
 */
export const TUTORIAL_FADE_CLASS = 'dcf-storyboard-tutorial__overlay--fade';

/**
 * @description CSS class applied to targets by the fade strategy.
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.focus
 */
export const TUTORIAL_FADE_TARGET_CLASS = 'dcf-storyboard-tutorial__target--focused';

/**
 * @description CSS class applied to the overlay by the highlight strategy.
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.focus
 */
export const TUTORIAL_HIGHLIGHT_CLASS = 'dcf-storyboard-tutorial__overlay--highlight';

/**
 * @description CSS class applied to targets by the highlight strategy.
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.focus
 */
export const TUTORIAL_HIGHLIGHT_TARGET_CLASS = 'dcf-storyboard-tutorial__target--highlighted';

/**
 * @description Focus strategy that fades/blurs everything but the targets.
 * @summary Adds a backdrop blur to the blocking overlay so all page content
 * outside the whitelisted target holes appears faded, and marks the targets as
 * focused so they stay crisp above the overlay.
 * @class FadeFocusStrategy
 * @implements {TutorialFocusStrategy}
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.focus
 */
export class FadeFocusStrategy<C extends TutorialContext = TutorialContext>
  implements TutorialFocusStrategy<C>
{
  /** @inheritdoc */
  readonly name: string = 'fade';

  /**
   * @description Applies the fade/blur attention effect.
   * @param context the active focus context.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.focus
   */
  apply(context: TutorialFocusContext<C>): void {
    context.overlay.classList.add(TUTORIAL_FADE_CLASS);
    context.targets.forEach((target) => target.classList.add(TUTORIAL_FADE_TARGET_CLASS));
  }

  /**
   * @description Removes the fade/blur attention effect.
   * @param context the active focus context.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.focus
   */
  clear(context: TutorialFocusContext<C>): void {
    context.overlay.classList.remove(TUTORIAL_FADE_CLASS);
    context.targets.forEach((target) => target.classList.remove(TUTORIAL_FADE_TARGET_CLASS));
  }
}

/**
 * @description Focus strategy that draws a border around the targets.
 * @summary Dims the overlay and applies a highlight border to each whitelisted
 * target, leaving the rest of the page visible but inactive.
 * @class HighlightFocusStrategy
 * @implements {TutorialFocusStrategy}
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.focus
 */
export class HighlightFocusStrategy<C extends TutorialContext = TutorialContext>
  implements TutorialFocusStrategy<C>
{
  /** @inheritdoc */
  readonly name: string = 'highlight';

  /**
   * @description Applies the highlight-border attention effect.
   * @param context the active focus context.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.focus
   */
  apply(context: TutorialFocusContext<C>): void {
    context.overlay.classList.add(TUTORIAL_HIGHLIGHT_CLASS);
    context.targets.forEach((target) => target.classList.add(TUTORIAL_HIGHLIGHT_TARGET_CLASS));
  }

  /**
   * @description Removes the highlight-border attention effect.
   * @param context the active focus context.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.focus
   */
  clear(context: TutorialFocusContext<C>): void {
    context.overlay.classList.remove(TUTORIAL_HIGHLIGHT_CLASS);
    context.targets.forEach((target) => target.classList.remove(TUTORIAL_HIGHLIGHT_TARGET_CLASS));
  }
}
