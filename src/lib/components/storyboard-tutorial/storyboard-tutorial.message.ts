/**
 * @module module:lib/components/storyboard-tutorial/storyboard-tutorial.message
 * @description Built-in pluggable instruction/message strategy.
 * @summary `BubbleMessageStrategy` renders a text bubble/tooltip anchored to the
 * active step's target, together with the previous/next/abort controls. The
 * scenario provides it as the default and each step may override it.
 */

import type {
  StoryboardTutorialLabels,
  TutorialContext,
  TutorialMessageContext,
  TutorialMessageStrategy,
} from './storyboard-tutorial.types';

/**
 * @description CSS class of the bubble root element.
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.message
 */
export const TUTORIAL_BUBBLE_CLASS = 'dcf-storyboard-tutorial__bubble';

/**
 * @description Instruction strategy rendering a text bubble/tooltip.
 * @summary Builds the bubble DOM imperatively so it works with any anchor and
 * container. The bubble exposes an accessible dialog with the step title, content,
 * a progress indicator and the previous/next/abort controls wired to the engine.
 * @class BubbleMessageStrategy
 * @implements {TutorialMessageStrategy}
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.message
 */
export class BubbleMessageStrategy<C extends TutorialContext = TutorialContext>
  implements TutorialMessageStrategy<C>
{
  /** @inheritdoc */
  readonly name: string = 'bubble';

  /** Gap in pixels between the anchor and the bubble. */
  gap: number = 12;

  /**
   * @description Renders the instruction bubble for the active step.
   * @param context the active message context.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.message
   */
  render(context: TutorialMessageContext<C>): void {
    const { step, state, anchor, container, controls, labels } = context;
    this.clear(context);

    const bubble = container.ownerDocument.createElement('div');
    bubble.className = TUTORIAL_BUBBLE_CLASS;
    bubble.setAttribute('role', 'dialog');
    bubble.setAttribute('aria-modal', 'true');
    bubble.setAttribute('aria-live', 'polite');

    if (step.title) {
      const title = container.ownerDocument.createElement('h3');
      title.className = 'dcf-storyboard-tutorial__bubble-title';
      title.textContent = step.title;
      bubble.appendChild(title);
    }

    if (step.content) {
      const content = container.ownerDocument.createElement('p');
      content.className = 'dcf-storyboard-tutorial__bubble-content';
      content.textContent = step.content;
      bubble.appendChild(content);
    }

    const total = state.completed.length + state.steps.length;
    const footer = container.ownerDocument.createElement('div');
    footer.className = 'dcf-storyboard-tutorial__bubble-footer';

    const progress = container.ownerDocument.createElement('span');
    progress.className = 'dcf-storyboard-tutorial__bubble-progress';
    progress.textContent = (labels.progress ?? DEFAULT_LABELS.progress!)
      .replace('{current}', String(state.completed.length + 1))
      .replace('{total}', String(total));
    footer.appendChild(progress);

    const actions = container.ownerDocument.createElement('div');
    actions.className = 'dcf-storyboard-tutorial__bubble-actions';

    const previous = this.createButton(container, labels.previous ?? DEFAULT_LABELS.previous!, () => {
      controls.previous();
    });
    previous.disabled = state.cursor === 0;
    actions.appendChild(previous);

    if (context.completion) {
      const close = this.createButton(
        container,
        labels.close ?? DEFAULT_LABELS.close!,
        () => {
          void controls.complete('close');
        }
      );
      close.classList.add('dcf-storyboard-tutorial__bubble-close');
      close.setAttribute('aria-label', labels.close ?? DEFAULT_LABELS.close!);
      bubble.appendChild(close);
    }

    const isLast = !!step.final || state.steps.length <= 1;
    const advance = this.createButton(
      container,
      isLast ? labels.finish ?? DEFAULT_LABELS.finish! : labels.next ?? DEFAULT_LABELS.next!,
      () => {
        void controls.complete('next');
      }
    );
    advance.classList.add('dcf-storyboard-tutorial__bubble-primary');
    actions.appendChild(advance);

    const abort = this.createButton(container, labels.abort ?? DEFAULT_LABELS.abort!, () => {
      controls.abort();
    });
    abort.classList.add('dcf-storyboard-tutorial__bubble-abort');
    actions.appendChild(abort);

    footer.appendChild(actions);
    bubble.appendChild(footer);
    container.appendChild(bubble);

    this.position(bubble, anchor, step.placement);
  }

  /**
   * @description Removes the rendered bubble.
   * @param context the active message context.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.message
   */
  clear(context: TutorialMessageContext<C>): void {
    context.container
      .querySelectorAll(`.${TUTORIAL_BUBBLE_CLASS}`)
      .forEach((bubble) => bubble.remove());
  }

  /**
   * @description Creates a labelled control button.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.message
   */
  private createButton(
    container: HTMLElement,
    label: string,
    handler: () => void
  ): HTMLButtonElement {
    const button = container.ownerDocument.createElement('button');
    button.type = 'button';
    button.className = 'dcf-storyboard-tutorial__bubble-button';
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  }

  /**
   * @description Positions the bubble relative to its anchor.
   * @summary Falls back to centering the bubble when there is no anchor or when
   * the environment provides no layout information (e.g. jsdom).
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.message
   */
  private position(
    bubble: HTMLElement,
    anchor: HTMLElement | null,
    placement?: string
  ): void {
    if (!anchor || typeof anchor.getBoundingClientRect !== 'function') {
      bubble.style.top = '50%';
      bubble.style.left = '50%';
      bubble.style.transform = 'translate(-50%, -50%)';
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const gap = this.gap;
    switch (placement) {
      case 'top':
        bubble.style.left = `${rect.left}px`;
        bubble.style.top = `${rect.top - gap}px`;
        bubble.style.transform = 'translateY(-100%)';
        break;
      case 'left':
        bubble.style.left = `${rect.left - gap}px`;
        bubble.style.top = `${rect.top}px`;
        bubble.style.transform = 'translateX(-100%)';
        break;
      case 'right':
        bubble.style.left = `${rect.right + gap}px`;
        bubble.style.top = `${rect.top}px`;
        break;
      case 'center':
        bubble.style.top = '50%';
        bubble.style.left = '50%';
        bubble.style.transform = 'translate(-50%, -50%)';
        break;
      case 'bottom':
      default:
        bubble.style.left = `${rect.left}px`;
        bubble.style.top = `${rect.bottom + gap}px`;
        break;
    }
  }
}

/**
 * @description Fallback labels used when neither the step nor the scenario
 * provide one.
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.message
 */
export const DEFAULT_LABELS: Required<StoryboardTutorialLabels> = {
  previous: 'Previous',
  next: 'Next',
  finish: 'Finish',
  abort: 'Skip',
  close: 'Close',
  progress: '{current} / {total}',
};
