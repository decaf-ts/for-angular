/**
 * @module module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 * @description Shared types for the game-style scripted storyboard tutorial engine.
 * @summary Defines the scenario/step/state model, the pluggable focus and message
 * strategy contracts, and the controls surface exposed to steps and strategies.
 * The engine executes steps in order; each step receives the output of the previous
 * step and returns the whole remaining storyboard state, so a step may rewrite,
 * skip or insert later steps dynamically. The chaining is adapted from the
 * `@decaf-ts/utils` performance test runner consumer/producer step pattern.
 */

/**
 * @description Arbitrary context accumulated across a storyboard.
 * @summary The scenario's initial context is passed to the first step; each step
 * may return a rewritten state whose `context` becomes the input context of the
 * following step.
 * @typedef {Record<string, unknown>} TutorialContext
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export type TutorialContext = Record<string, unknown>;

/**
 * @description Lifecycle status of a running storyboard tutorial.
 * @summary `idle` before any scenario starts, `running` while a step is active,
 * `completed` when the last step has been consumed, and `aborted` when the user
 * stops the tutorial early.
 * @typedef {('idle'|'running'|'completed'|'aborted')} TutorialStatus
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export type TutorialStatus = 'idle' | 'running' | 'completed' | 'aborted';

/**
 * @description Preferred placement of an instruction message relative to its anchor.
 * @typedef {('top'|'bottom'|'left'|'right'|'center')} TutorialPlacement
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export type TutorialPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

/**
 * @description Localizable labels used by the built-in message strategies.
 * @summary Any label omitted falls back to the strategy default.
 * @interface StoryboardTutorialLabels
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export interface StoryboardTutorialLabels {
  /** Label for the "previous step" control. */
  previous?: string;
  /** Label for the "next step" control. */
  next?: string;
  /** Label for the final "finish" control. */
  finish?: string;
  /** Label for the "abort/skip" control. */
  abort?: string;
  /** Accessible label for the "close/complete" control. */
  close?: string;
  /** Template for the progress indicator; `{current}` and `{total}` are replaced. */
  progress?: string;
}

/**
 * @description The interaction kinds the completion engine can detect on a step.
 * @summary `click` watches for a pointer click, `drag` for a pointer drag beyond a
 * distance threshold, `input` for text typed into a field and `keys` for a keyboard
 * key press. Each is scoped to the step's whitelist/action selector so detection
 * respects the same blocking semantics as the overlay.
 * @typedef {('click'|'drag'|'input'|'keys')} TutorialActionType
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export type TutorialActionType = 'click' | 'drag' | 'input' | 'keys';

/**
 * @description Declares the user interaction that completes a step.
 * @summary When a step (or scenario) sets `action`, the engine arms a DOM
 * listener and advances only once the declared interaction is observed. The
 * `selector` scopes the interaction to matching elements (falling back to the step's
 * `target`, then its `whitelist`); with no selector any interaction outside the
 * tutorial host counts. `keys` filters keyboard keys, `minLength` the minimum typed
 * characters and `threshold`/`button` refine drag distance and mouse button.
 * @interface TutorialActionDetection
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export interface TutorialActionDetection {
  /** The interaction kind to detect. */
  type: TutorialActionType;
  /** CSS selector the interaction must target; defaults to the step target/whitelist. */
  selector?: string;
  /** For `keys`: the key(s) that count; any key when omitted. */
  keys?: string | string[];
  /** For `input`: minimum number of characters typed before it counts. */
  minLength?: number;
  /** For `drag`: minimum pointer travel in pixels before it counts. */
  threshold?: number;
  /** For `click`: the mouse button that counts (0 is primary). */
  button?: number;
}

/**
 * @description Per-step pluggable completion policy.
 * @summary Controls HOW the active step completes. `timeout` auto-advances after
 * the given milliseconds, `action` advances when the declared user interaction is
 * detected and `minTime` is a universal floor that delays any completion (manual
 * close, action or timeout) until the step has been visible for that long. With
 * both `action` and `timeout` set the first trigger wins; with `minTime` alone the
 * step completes on an explicit close/imperative trigger after the floor.
 * @interface TutorialCompletionConfig
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export interface TutorialCompletionConfig {
  /** Auto-advance after this many milliseconds. */
  timeout?: number;
  /** Minimum milliseconds the step must stay active before any completion fires. */
  minTime?: number;
  /** Advance when this user interaction is detected. */
  action?: TutorialActionDetection;
}

/**
 * @description Why a step completion was requested.
 * @summary `timeout` for an auto-advance timer, `action` for a detected user
 * interaction, `close` for the message bubble's close control, `next` for the
 * message strategy's advance control and `external` for an app-driven imperative
 * trigger.
 * @typedef {('timeout'|'action'|'close'|'next'|'external')} TutorialCompletionReason
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export type TutorialCompletionReason = 'timeout' | 'action' | 'close' | 'next' | 'external';

/**
 * @description The whole remaining storyboard state produced by a step.
 * @summary `steps[0]` is the active step. `context` is the accumulated context
 * (the scenario's initial context for step 1, or the previous step's output
 * context afterwards). `cursor` is the zero-based index of the active step in the
 * original scenario and `completed` lists the ids already consumed.
 * @interface StoryboardTutorialState
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export interface StoryboardTutorialState<C extends TutorialContext = TutorialContext> {
  /** Identifier of the scenario this state belongs to. */
  scenarioId: string;
  /** Accumulated context shared across steps. */
  context: C;
  /** Remaining steps; `steps[0]` is the active step. */
  steps: StoryboardTutorialStep<C>[];
  /** Zero-based index of the active step within the original scenario. */
  cursor: number;
  /** Ids of the steps already consumed, in execution order. */
  completed: string[];
  /** Lifecycle status of this storyboard run. */
  status: TutorialStatus;
}

/**
 * @description Controls surface exposed to steps, message strategies and the host component.
 * @summary The engine implements this interface, so passing it around never leaks the
 * engine internals. `state` and `active` always reflect the current run.
 * @interface StoryboardTutorialControls
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export interface StoryboardTutorialControls<C extends TutorialContext = TutorialContext> {
  /** The current whole storyboard state, or null when no tutorial is running. */
  readonly state: StoryboardTutorialState<C> | null;
  /** The currently active step, or null when no tutorial is running. */
  readonly active: StoryboardTutorialStep<C> | null;
  /** Advances to the next step; resolves with the new state. */
  next(): Promise<StoryboardTutorialState<C> | null>;
  /** Returns to the previous step; resolves with the restored state. */
  previous(): StoryboardTutorialState<C> | null;
  /** Jumps to the step with the given id. */
  goTo(stepId: string): StoryboardTutorialState<C> | null;
  /**
   * @description Requests completion of the active step using its completion policy.
   * @summary This is the config-aware, idempotent trigger used by timeouts,
   * detected user actions, the message bubble's close control and app buttons. It
   * honours the step's `minTime` floor (deferring an early request until the
   * floor elapses) and never advances the same step twice.
   * @param reason why the completion is being requested.
   * @returns true when the step advanced, false when the request was deferred or ignored.
   */
  complete(reason?: TutorialCompletionReason): Promise<boolean>;
  /** Aborts the running tutorial. */
  abort(): StoryboardTutorialState<C> | null;
  /** Ends the running tutorial successfully. */
  end(): StoryboardTutorialState<C> | null;
}

/**
 * @description Input handed to a step's `run` function.
 * @summary `previous` is the whole state output by the previous step (undefined
 * for step 1, which receives the scenario's initial context in `state.context`).
 * `state` is the active storyboard before the step runs and `controls` exposes the
 * engine for advanced mutation.
 * @interface StoryboardTutorialStepInput
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export interface StoryboardTutorialStepInput<C extends TutorialContext = TutorialContext> {
  /** The step being executed. */
  step: StoryboardTutorialStep<C>;
  /** Output of the previous step, or undefined for the first step. */
  previous?: StoryboardTutorialState<C>;
  /** The active storyboard state before this step runs. */
  state: StoryboardTutorialState<C>;
  /** Zero-based index of this step within the current storyboard. */
  index: number;
  /** Engine controls, for steps that need to drive the tutorial. */
  controls: StoryboardTutorialControls<C>;
}

/**
 * @description Result returned by a step's `run` function.
 * @summary Returning `void`/`undefined` advances to the next step. Returning a
 * full {@link StoryboardTutorialState} replaces the whole remaining storyboard
 * (rewrite/skip/insert). Returning a partial state merges into the current state
 * and then advances. A returned state whose active step is still the executed step
 * is rejected as a non-advancing loop.
 * @typedef {(StoryboardTutorialState<C>|Partial<StoryboardTutorialState<C>>|void)} StoryboardTutorialStepResult
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export type StoryboardTutorialStepResult<C extends TutorialContext = TutorialContext> =
  | StoryboardTutorialState<C>
  | Partial<StoryboardTutorialState<C>>
  | void;

/**
 * @description Executable step function.
 * @summary Receives the previous step's output as input and returns the whole
 * remaining storyboard state. Adapted from the `@decaf-ts/utils` performance test
 * runner's consumer/producer phase generator.
 * @typedef {Function} StoryboardTutorialStepRunner
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export type StoryboardTutorialStepRunner<C extends TutorialContext = TutorialContext> = (
  input: StoryboardTutorialStepInput<C>
) => StoryboardTutorialStepResult<C> | Promise<StoryboardTutorialStepResult<C>>;

/**
 * @description A single scripted tutorial step.
 * @summary `whitelist` selectors keep their elements interactive while the step
 * is active; every other page element is blocked. `focus` and `message` override
 * the scenario-level strategies for this step only. `route` documents the page the
 * step belongs to, which the host uses to survive navigation.
 * @interface StoryboardTutorialStep
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export interface StoryboardTutorialStep<C extends TutorialContext = TutorialContext> {
  /** Stable step identifier, unique within a scenario. */
  id: string;
  /** Optional instruction title. */
  title?: string;
  /** Optional instruction body. */
  content?: string;
  /** Route/page the step applies to; informational for navigation survival. */
  route?: string | RegExp;
  /** CSS selectors whose elements stay interactive while this step is active. */
  whitelist?: string[];
  /** Selector used to anchor the instruction message; defaults to the first whitelist entry. */
  target?: string;
  /** Preferred message placement. */
  placement?: TutorialPlacement;
  /** Per-step focus/attention override. */
  focus?: TutorialFocusStrategy<C>;
  /** Per-step instruction override. */
  message?: TutorialMessageStrategy<C>;
  /** Per-step message labels override. */
  labels?: StoryboardTutorialLabels;
  /** Per-step completion policy; `false` disables the scenario default for this step. */
  completion?: TutorialCompletionConfig | false;
  /** Marks the step as the final one so the message strategy offers a finish control. */
  final?: boolean;
  /** Arbitrary payload made available to strategies. */
  data?: Record<string, unknown>;
  /** Step logic; receives the previous output and returns the remaining storyboard. */
  run?: StoryboardTutorialStepRunner<C>;
}

/**
 * @description A scriptable storyboard tutorial scenario.
 * @summary The scenario-level `focus`/`message` strategies are the defaults for
 * every step and may be overridden per step. `context` is the initial context
 * handed to step 1. `persist` opts the run into sessionStorage navigation
 * survival; the root service always survives Angular route navigation in memory.
 * @interface StoryboardTutorialScenario
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export interface StoryboardTutorialScenario<C extends TutorialContext = TutorialContext> {
  /** Stable scenario identifier, used to restore persisted runs. */
  id: string;
  /** Optional human-readable name. */
  name?: string;
  /** Ordered steps; a step may rewrite this list at runtime. */
  steps: StoryboardTutorialStep<C>[];
  /** Initial context handed to the first step. */
  context?: C;
  /** Scenario-level focus/attention default. */
  focus?: TutorialFocusStrategy<C>;
  /** Scenario-level instruction default. */
  message?: TutorialMessageStrategy<C>;
  /** Scenario-level completion default; overridden per step. */
  completion?: TutorialCompletionConfig;
  /** Scenario-level message labels default. */
  labels?: StoryboardTutorialLabels;
  /** Whether to persist the run to sessionStorage for hard-reload survival. */
  persist?: boolean;
  /** Invoked once the tutorial starts. */
  onStart?: (controls: StoryboardTutorialControls<C>) => void;
  /** Invoked once the tutorial ends successfully. */
  onEnd?: (state: StoryboardTutorialState<C>) => void;
  /** Invoked once the tutorial is aborted. */
  onAbort?: (state: StoryboardTutorialState<C>) => void;
}

/**
 * @description Context passed to a focus/attention strategy.
 * @interface TutorialFocusContext
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export interface TutorialFocusContext<C extends TutorialContext = TutorialContext> {
  /** The active step. */
  step: StoryboardTutorialStep<C>;
  /** The active storyboard state. */
  state: StoryboardTutorialState<C>;
  /** The whitelisted target elements for the active step. */
  targets: HTMLElement[];
  /** The blocking overlay element the strategy may style. */
  overlay: HTMLElement;
  /** The tutorial host element. */
  root: HTMLElement;
}

/**
 * @description Pluggable focus/attention mechanism.
 * @summary Implementations draw attention to the whitelisted targets and/or fade
 * the rest. `apply` is invoked for every active step and `clear` whenever the
 * step changes or the tutorial stops. A scenario provides the default and each step
 * may override it.
 * @interface TutorialFocusStrategy
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export interface TutorialFocusStrategy<C extends TutorialContext = TutorialContext> {
  /** Strategy name, surfaced for diagnostics and tests. */
  readonly name: string;
  /** Applies the attention effect for the active step. */
  apply(context: TutorialFocusContext<C>): void;
  /** Removes the attention effect. */
  clear(context: TutorialFocusContext<C>): void;
}

/**
 * @description Context passed to an instruction/message strategy.
 * @interface TutorialMessageContext
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export interface TutorialMessageContext<C extends TutorialContext = TutorialContext> {
  /** The active step. */
  step: StoryboardTutorialStep<C>;
  /** The active storyboard state. */
  state: StoryboardTutorialState<C>;
  /** The whitelisted target elements for the active step. */
  targets: HTMLElement[];
  /** The element the message should anchor to, or null when there is no target. */
  anchor: HTMLElement | null;
  /** The container the strategy renders into. */
  container: HTMLElement;
  /** Controls the message strategy may drive. */
  controls: StoryboardTutorialControls<C>;
  /** Resolved labels for the message controls. */
  labels: StoryboardTutorialLabels;
  /** Resolved completion policy for the active step, when one is configured. */
  completion?: TutorialCompletionConfig;
}

/**
 * @description Pluggable instruction/explanation mechanism.
 * @summary Implementations render the step's instruction and its navigation
 * controls. A scenario provides the default and each step may override it.
 * @interface TutorialMessageStrategy
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export interface TutorialMessageStrategy<C extends TutorialContext = TutorialContext> {
  /** Strategy name, surfaced for diagnostics and tests. */
  readonly name: string;
  /** Renders the instruction for the active step. */
  render(context: TutorialMessageContext<C>): void;
  /** Removes the rendered instruction. */
  clear(context: TutorialMessageContext<C>): void;
}

/**
 * @description Default focus strategy name.
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export const DEFAULT_TUTORIAL_FOCUS = 'fade';

/**
 * @description Default message strategy name.
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export const DEFAULT_TUTORIAL_MESSAGE = 'bubble';

/**
 * @description CSS class applied to the tutorial host while a tutorial is active.
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export const TUTORIAL_ACTIVE_CLASS = 'dcf-storyboard-tutorial--active';

/**
 * @description Attribute set on elements whitelisted by the active step.
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export const TUTORIAL_WHITELIST_ATTRIBUTE = 'data-dcf-tutorial-whitelisted';

/**
 * @description sessionStorage key used to persist the active run across reloads.
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export const TUTORIAL_STORAGE_KEY = 'dcf-storyboard-tutorial';

/**
 * @description Default minimum pointer travel, in pixels, for a `drag` action.
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export const DEFAULT_TUTORIAL_DRAG_THRESHOLD = 10;

/**
 * @description Default minimum typed characters for an `input` action.
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.types
 */
export const DEFAULT_TUTORIAL_INPUT_LENGTH = 1;
