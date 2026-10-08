/**
 * @module module:lib/components/storyboard-tutorial/storyboard-tutorial.component
 * @description Game-style scripted storyboard tutorial component.
 * @summary `StoryboardTutorialComponent` (selector `ngx-decaf-storyboard-tutorial`)
 * drives a {@link StoryboardTutorialScenario}: it renders the active step's
 * pluggable focus and message strategies, blocks all page interaction except the
 * step's whitelisted selectors via a pointer-events overlay, and delegates run
 * state to the root-provided {@link StoryboardTutorialService} so tutorials
 * survive Angular route navigation.
 */

import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Dynamic } from '../../engine/decorators';
import { generateRandomValue } from '../../utils';
import { StoryboardTutorialService } from './storyboard-tutorial.service';
import { BubbleMessageStrategy } from './storyboard-tutorial.message';
import { FadeFocusStrategy } from './storyboard-tutorial.focus';
import {
  resolveTutorialCompletion,
  StoryboardTutorialActionDetector,
} from './storyboard-tutorial.completion';
import {
  StoryboardTutorialLabels,
  StoryboardTutorialScenario,
  StoryboardTutorialState,
  StoryboardTutorialStep,
  TUTORIAL_ACTIVE_CLASS,
  TUTORIAL_WHITELIST_ATTRIBUTE,
  TutorialCompletionReason,
  TutorialContext,
  TutorialFocusContext,
  TutorialFocusStrategy,
  TutorialMessageContext,
  TutorialMessageStrategy,
  TutorialStatus,
} from './storyboard-tutorial.types';

/**
 * @description Game-style scripted storyboard tutorial component.
 * @summary Hosts the tutorial overlay. It binds a scenario to the root service,
 * renders the active step through its focus/message strategies and blocks every
 * page interaction except the step's whitelisted selectors. When the component is
 * destroyed by a route change the service keeps the run alive, so the next host
 * instance resumes the same step.
 * @class StoryboardTutorialComponent
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
 */
@Dynamic()
@Component({
  standalone: true,
  selector: 'ngx-decaf-storyboard-tutorial',
  templateUrl: './storyboard-tutorial.component.html',
  styleUrls: ['./storyboard-tutorial.component.scss'],
  imports: [],
  host: { '[attr.id]': 'uid' },
})
export class StoryboardTutorialComponent<C extends TutorialContext = TutorialContext>
  implements OnInit, AfterViewInit, OnDestroy
{
  /** The scenario to run. */
  @Input() scenario?: StoryboardTutorialScenario<C>;

  /** Starts the scenario automatically when nothing is running. */
  @Input() autoStart: boolean = false;

  /** Persists the run to sessionStorage for hard-reload survival. */
  @Input() persist: boolean = true;

  /** Default focus/attention strategy; scenario/step may override. */
  @Input() focusStrategy?: TutorialFocusStrategy<C>;

  /** Default instruction strategy; scenario/step may override. */
  @Input() messageStrategy?: TutorialMessageStrategy<C>;

  /** Emits when a tutorial starts or resumes. */
  @Output() started: EventEmitter<StoryboardTutorialState<C>> = new EventEmitter<StoryboardTutorialState<C>>();

  /** Emits on every step transition. */
  @Output() stepped: EventEmitter<StoryboardTutorialState<C>> = new EventEmitter<StoryboardTutorialState<C>>();

  /** Emits with the terminal status when the tutorial ends or is aborted. */
  @Output() finished: EventEmitter<TutorialStatus> = new EventEmitter<TutorialStatus>();

  /** The overlay element that blocks interaction. */
  @ViewChild('overlay', { static: true }) overlayRef?: ElementRef<HTMLElement>;

  /** The container the message strategy renders into. */
  @ViewChild('messageHost', { static: true }) messageHostRef?: ElementRef<HTMLElement>;

  /** Component instance identifier. */
  uid: string = generateRandomValue(8);

  /** The root tutorial service. */
  readonly service = inject(StoryboardTutorialService<C>);

  /** Reactive run status. */
  readonly status = this.service.status;

  /** Reactive active step. */
  readonly active = this.service.active;

  /** True while a tutorial is running. */
  readonly isRunning = this.service.isRunning;

  /** The tutorial host element. */
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  /** Fallback focus strategy when neither the step, scenario nor input provides one. */
  private readonly defaultFocus = new FadeFocusStrategy<C>();

  /** Fallback message strategy when neither the step, scenario nor input provides one. */
  private readonly defaultMessage = new BubbleMessageStrategy<C>();

  /** Detects the active step's declared user interaction and completes it. */
  private readonly actionDetector = new StoryboardTutorialActionDetector<C>();

  /** Focus strategy currently applied, with its context, so it can be cleared. */
  private appliedFocus?: { strategy: TutorialFocusStrategy<C>; context: TutorialFocusContext<C> };

  /** Message strategy currently applied, with its context, so it can be cleared. */
  private appliedMessage?: { strategy: TutorialMessageStrategy<C>; context: TutorialMessageContext<C> };

  /** Original `pointer-events` styles of whitelisted targets, restored on teardown. */
  private readonly originalTargetStyles = new Map<HTMLElement, string>();

  /** Id of the last rendered step, used to detect start/step transitions. */
  private lastStepId: string | null = null;

  /** Element focused before the tutorial started; restored on teardown. */
  private lastFocusedElement: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const state = this.service.state();
      this.render(state);
    });
  }

  /**
   * @description Angular lifecycle hook: binds the scenario input to the root service.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  ngOnInit(): void {
    if (!this.scenario) return;
    this.service.bind(this.scenario, {
      persist: this.persist,
      autoStart: this.autoStart,
    });
  }

  /**
   * @description Angular lifecycle hook: repaints the restored/resumed step.
   * @summary Ensures the active step paints even if the reactive effect ran
   * before the static view queries were resolved.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  ngAfterViewInit(): void {
    // Ensure the restored/resumed step paints even if the effect ran before the
    // static view queries were resolved.
    this.render(this.service.state());
  }

  /**
   * @description Angular lifecycle hook: tears down visuals while keeping the run alive.
   * @summary Navigation survival: the service keeps the run, so the next host
   * instance resumes the same step.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  ngOnDestroy(): void {
    // Navigation survival: tear down the visual effects but keep the run alive.
    this.teardown();
  }

  /**
   * @description Starts the bound scenario.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  start(): void {
    if (!this.scenario) return;
    const state = this.service.start(this.scenario);
    this.started.emit(state);
  }

  /**
   * @description Advances to the next step.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  async next(): Promise<void> {
    await this.service.next();
  }

  /**
   * @description Requests completion of the active step using its completion policy.
   * @summary First-class imperative trigger for app buttons and the message
   * bubble's close control. Honours the step's `minTime` floor and never
   * double-advances; `next()` remains the explicit unconditional navigation.
   * @param reason why the completion is being requested.
   * @returns true when the step advanced, false when deferred or ignored.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  async complete(reason?: TutorialCompletionReason): Promise<boolean> {
    return this.service.complete(reason);
  }

  /**
   * @description Returns to the previous step.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  previous(): void {
    this.service.previous();
  }

  /**
   * @description Aborts the running tutorial.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  abort(): void {
    this.service.abort();
  }

  /**
   * @description Ends the running tutorial.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  end(): void {
    this.service.end();
  }

  /**
   * @description Recomputes the whitelist holes after a viewport resize.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  @HostListener('window:resize')
  onResize(): void {
    this.render(this.service.state());
  }

  /**
   * @description Blocks keyboard interaction outside whitelisted targets.
   * @summary While a step is active, keys are only allowed when the event
   * target is inside a whitelisted element or inside the tutorial host, so the
   * instruction controls and the whitelisted page elements stay usable.
   * @param event the keydown event.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.isRunning()) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (this.hostRef.nativeElement.contains(target)) return;
    if (target.closest(`[${TUTORIAL_WHITELIST_ATTRIBUTE}]`)) return;
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * @description Renders the active step's focus and message strategies.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  private render(state: StoryboardTutorialState<C> | null): void {
    const overlay = this.overlayRef?.nativeElement;
    const messageHost = this.messageHostRef?.nativeElement;
    const root = this.hostRef.nativeElement;
    if (!overlay || !messageHost) return;

    const running = !!state && state.status === 'running' && !!state.steps[0];
    if (!running) {
      const wasRunning = this.lastStepId !== null;
      this.teardown();
      this.lastStepId = null;
      if (wasRunning) this.finished.emit(this.service.status());
      return;
    }

    const step = state!.steps[0];
    if (this.lastStepId === null)
      this.lastFocusedElement = root.ownerDocument.activeElement as HTMLElement | null;
    root.classList.add(TUTORIAL_ACTIVE_CLASS);

    this.clearStrategies();
    const targets = this.resolveTargets(step.whitelist, root);
    this.applyInteractionBlock(overlay, targets);

    const scenario = this.scenario;
    const focus = step.focus ?? scenario?.focus ?? this.focusStrategy ?? this.defaultFocus;
    const message = step.message ?? scenario?.message ?? this.messageStrategy ?? this.defaultMessage;
    const completion = resolveTutorialCompletion(step, scenario);

    const focusContext: TutorialFocusContext<C> = { step, state: state!, targets, overlay, root };
    focus.apply(focusContext);
    this.appliedFocus = { strategy: focus, context: focusContext };

    const anchor = this.resolveAnchor(step, targets);
    const messageContext: TutorialMessageContext<C> = {
      step,
      state: state!,
      targets,
      anchor,
      container: messageHost,
      controls: this.service.controls,
      labels: this.resolveLabels(step),
      completion,
    };
    message.render(messageContext);
    this.appliedMessage = { strategy: message, context: messageContext };

    if (completion?.action) {
      this.actionDetector.arm({
        step,
        config: completion.action,
        controls: this.service.controls,
        root,
        document: root.ownerDocument,
      });
    }

    if (step.id !== this.lastStepId) {
      if (this.lastStepId === null) this.started.emit(state!);
      else this.stepped.emit(state!);
      this.lastStepId = step.id;
    }
  }

  /**
   * @description Resolves the labels for the active step.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  private resolveLabels(step: StoryboardTutorialStep<C>): StoryboardTutorialLabels {
    return {
      ...(this.scenario?.labels ?? {}),
      ...(step.labels ?? {}),
    };
  }

  /**
   * @description Resolves the whitelisted target elements for a step.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  private resolveTargets(whitelist: string[] | undefined, root: HTMLElement): HTMLElement[] {
    if (!whitelist?.length) return [];
    const document = root.ownerDocument;
    const targets: HTMLElement[] = [];
    whitelist.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (element instanceof HTMLElement && !root.contains(element)) targets.push(element);
      });
    });
    return targets;
  }

  /**
   * @description Resolves the message anchor for a step.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  private resolveAnchor(step: StoryboardTutorialStep<C>, targets: HTMLElement[]): HTMLElement | null {
    const root = this.hostRef.nativeElement;
    if (step.target) {
      const element = root.ownerDocument.querySelector(step.target);
      if (element instanceof HTMLElement) return element;
    }
    return targets[0] ?? null;
  }

  /**
   * @description Blocks page interaction except the whitelisted targets.
   * @summary The overlay captures pointer events for the whole viewport. Each
   * whitelisted target is marked and re-enabled, and an evenodd clip-path cuts a
   * hole over it so pointer events pass through to the underlying element without
   * disturbing the page's stacking contexts (router/Ionic safe).
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  private applyInteractionBlock(overlay: HTMLElement, targets: HTMLElement[]): void {
    targets.forEach((target) => {
      if (!this.originalTargetStyles.has(target))
        this.originalTargetStyles.set(target, target.style.pointerEvents);
      target.setAttribute(TUTORIAL_WHITELIST_ATTRIBUTE, 'true');
      target.style.pointerEvents = 'auto';
    });

    const rects = targets
      .map((target) => target.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0);
    if (!rects.length) {
      overlay.style.clipPath = '';
      return;
    }
    const holes = rects
      .map(
        (rect) =>
          `${rect.left}px ${rect.top}px, ${rect.right}px ${rect.top}px, ${rect.right}px ${rect.bottom}px, ${rect.left}px ${rect.bottom}px, ${rect.left}px ${rect.top}px`
      )
      .join(', ');
    overlay.style.clipPath = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${holes})`;
  }

  /**
   * @description Restores the whitelisted targets' original styles.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  private clearInteractionBlock(overlay: HTMLElement | undefined): void {
    if (overlay) overlay.style.clipPath = '';
    this.originalTargetStyles.forEach((pointerEvents, target) => {
      target.removeAttribute(TUTORIAL_WHITELIST_ATTRIBUTE);
      target.style.pointerEvents = pointerEvents;
    });
    this.originalTargetStyles.clear();
  }

  /**
   * @description Clears the applied focus and message strategies.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  private clearStrategies(): void {
    this.actionDetector.disarm();
    if (this.appliedFocus) {
      this.appliedFocus.strategy.clear(this.appliedFocus.context);
      this.appliedFocus = undefined;
    }
    if (this.appliedMessage) {
      this.appliedMessage.strategy.clear(this.appliedMessage.context);
      this.appliedMessage = undefined;
    }
  }

  /**
   * @description Removes all tutorial visuals from the page.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.component
   */
  private teardown(): void {
    this.clearStrategies();
    this.clearInteractionBlock(this.overlayRef?.nativeElement);
    this.hostRef.nativeElement.classList.remove(TUTORIAL_ACTIVE_CLASS);
    if (this.lastFocusedElement?.isConnected) this.lastFocusedElement.focus();
    this.lastFocusedElement = null;
  }
}
