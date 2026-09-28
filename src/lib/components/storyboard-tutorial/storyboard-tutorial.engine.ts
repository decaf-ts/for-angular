/**
 * @module module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
 * @description Framework-agnostic storyboard tutorial engine.
 * @summary Runs a scenario as an ordered list of steps. Each step receives the
 * whole state output by the previous step (step 1 receives the scenario's initial
 * context) and returns the whole remaining storyboard state, so a step may rewrite,
 * skip or insert later steps dynamically. The chaining is adapted from the
 * `@decaf-ts/utils` performance test runner's consumer/producer phase pattern.
 */

import { BadRequestError, InternalError, NotFoundError } from '@decaf-ts/db-decorators';
import { resolveTutorialCompletion } from './storyboard-tutorial.completion';
import type {
  StoryboardTutorialControls,
  StoryboardTutorialScenario,
  StoryboardTutorialState,
  StoryboardTutorialStep,
  StoryboardTutorialStepResult,
  TutorialCompletionConfig,
  TutorialCompletionReason,
  TutorialContext,
  TutorialStatus,
} from './storyboard-tutorial.types';

/**
 * @description Injectable time source for the engine's completion timers.
 * @summary Keeps the engine deterministic and testable: tests can supply a fake
 * clock and advance it without waiting on real time.
 * @interface StoryboardTutorialClock
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
 */
export interface StoryboardTutorialClock {
  /** Returns the current time in milliseconds. */
  now(): number;
  /** Schedules `handler` after `delay` milliseconds and returns a handle. */
  setTimer(handler: () => void, delay: number): unknown;
  /** Cancels a handle returned by `setTimer`. */
  clearTimer(handle: unknown): void;
}

/**
 * @description Default clock backed by `Date.now` and the global timers.
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
 */
export const defaultStoryboardTutorialClock: StoryboardTutorialClock = {
  now: () => Date.now(),
  setTimer: (handler: () => void, delay: number) => setTimeout(handler, delay),
  clearTimer: (handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * @description Notifies the host of a state or status transition.
 * @summary Invoked with the whole storyboard state (or null once the tutorial
 * stops) and the new status, on every engine transition.
 * @typedef {Function} StoryboardTutorialChangeListener
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
 */
export type StoryboardTutorialChangeListener<C extends TutorialContext = TutorialContext> = (
  state: StoryboardTutorialState<C> | null,
  status: TutorialStatus
) => void;

/**
 * @description History entry captured before each executed step.
 * @summary Holds the state the step executed against and the output of the step
 * before it, so {@link StoryboardTutorialEngine.previous} can restore both.
 * @interface HistoryEntry
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
 */
interface HistoryEntry<C extends TutorialContext> {
  state: StoryboardTutorialState<C>;
  output?: StoryboardTutorialState<C>;
}

/**
 * @description The storyboard tutorial engine.
 * @summary Pure, DOM-free state machine that owns the running scenario, exposes
 * the {@link StoryboardTutorialControls} surface and emits state/status changes to
 * the host. Being framework-agnostic keeps the chaining, mutation, history and
 * restore logic unit-testable in isolation.
 * @class StoryboardTutorialEngine
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
 */
export class StoryboardTutorialEngine<C extends TutorialContext = TutorialContext>
  implements StoryboardTutorialControls<C>
{
  /** Registered scenarios, keyed by id, used to restore persisted runs. */
  private readonly registry = new Map<string, StoryboardTutorialScenario<C>>();

  /** The active scenario, when one is running. */
  private scenario: StoryboardTutorialScenario<C> | null = null;

  /** The current whole storyboard state, or null when idle. */
  private current: StoryboardTutorialState<C> | null = null;

  /** The whole state output by the previously executed step. */
  private output?: StoryboardTutorialState<C>;

  /** Stack of states/outputs captured before each executed step. */
  private history: HistoryEntry<C>[] = [];

  /** The last non-null status emitted. */
  private lastStatus: TutorialStatus = 'idle';

  /** The active completion timer handle, when a step has a timeout. */
  private completionTimer: unknown = null;

  /** Whether the active step's completion already fired, to prevent double-advance. */
  private completionFired: boolean = false;

  /** Id of the step the completion state currently belongs to. */
  private completionStepId: string | null = null;

  /** Time, in milliseconds, at which the active step became active. */
  private completionStartedAt: number = 0;

  /**
   * @description Creates an engine instance.
   * @param onChange optional listener notified on every state/status transition.
   * @param clock injectable time source; defaults to the global timers.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  constructor(
    private readonly onChange?: StoryboardTutorialChangeListener<C>,
    private readonly clock: StoryboardTutorialClock = defaultStoryboardTutorialClock
  ) {}

  /** The current whole storyboard state, or null when no tutorial is running. */
  get state(): StoryboardTutorialState<C> | null {
    return this.current;
  }

  /** The currently active step, or null when no tutorial is running. */
  get active(): StoryboardTutorialStep<C> | null {
    return this.current?.steps[0] ?? null;
  }

  /** The current lifecycle status. */
  get status(): TutorialStatus {
    return this.current?.status ?? this.lastStatus;
  }

  /**
   * @description Registers a scenario so it can be started by id later.
   * @summary Registration is idempotent and is what allows a persisted run to be
   * rebuilt after a hard reload, once the host re-supplies the scenario.
   * @param scenario the scenario to register.
   * @returns the registered scenario.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  register(scenario: StoryboardTutorialScenario<C>): StoryboardTutorialScenario<C> {
    if (!scenario?.id) throw new BadRequestError('A storyboard tutorial scenario requires an id');
    this.registry.set(scenario.id, scenario);
    return scenario;
  }

  /**
   * @description Resolves a registered scenario by id.
   * @param id the scenario id.
   * @returns the registered scenario or undefined.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  registered(id: string): StoryboardTutorialScenario<C> | undefined {
    return this.registry.get(id);
  }

  /**
   * @description Starts a scenario.
   * @summary Builds the initial whole storyboard state from the scenario's steps
   * and initial context, resets the history, emits the change and invokes the
   * scenario `onStart` hook.
   * @param scenarioOrId the scenario instance or a registered scenario id.
   * @param context optional initial context overriding the scenario's own context.
   * @returns the initial storyboard state.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  start(
    scenarioOrId: StoryboardTutorialScenario<C> | string,
    context?: C
  ): StoryboardTutorialState<C> {
    const scenario =
      typeof scenarioOrId === 'string' ? this.registry.get(scenarioOrId) : this.register(scenarioOrId);
    if (!scenario)
      throw new NotFoundError(`Storyboard tutorial scenario "${String(scenarioOrId)}" is not registered`);

    this.scenario = scenario;
    this.history = [];
    this.output = undefined;
    this.current = {
      scenarioId: scenario.id,
      context: (context ?? scenario.context ?? ({} as C)) as C,
      steps: [...scenario.steps],
      cursor: 0,
      completed: [],
      status: 'running',
    };
    this.armCompletion();
    this.emit();
    scenario.onStart?.(this);
    return this.current;
  }

  /**
   * @description Rebuilds an in-memory run from a persisted state.
   * @summary Used to resume a tutorial after a hard reload. Only the steps still
   * present in the registered scenario can be restored; steps a prior run inserted
   * dynamically are lost, which is the documented reload limitation.
   * @param scenario the scenario to restore against.
   * @param snapshot the persisted state snapshot.
   * @returns the restored storyboard state.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  restore(
    scenario: StoryboardTutorialScenario<C>,
    snapshot: Pick<StoryboardTutorialState<C>, 'context' | 'cursor' | 'completed'>
  ): StoryboardTutorialState<C> {
    this.register(scenario);
    this.scenario = scenario;
    this.history = [];
    this.output = undefined;
    const completed = snapshot.completed ?? [];
    const remaining = scenario.steps.filter((step) => !completed.includes(step.id));
    this.current = {
      scenarioId: scenario.id,
      context: (snapshot.context ?? scenario.context ?? ({} as C)) as C,
      steps: remaining,
      cursor: snapshot.cursor ?? completed.length,
      completed: [...completed],
      status: 'running',
    };
    this.armCompletion();
    this.emit();
    return this.current;
  }

  /**
   * @description Executes the active step and advances the storyboard.
   * @summary The step's `run` receives the previous step's output as input and
   * returns the whole remaining storyboard state. A `void` result advances by one
   * step, a state result replaces the storyboard, and a partial result merges
   * before advancing. A returned state that keeps the executed step active is
   * rejected as a non-advancing loop.
   * @returns the resulting state, or null when the tutorial has ended.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  async next(): Promise<StoryboardTutorialState<C> | null> {
    const state = this.current;
    if (!state || state.status !== 'running') return state;
    const step = state.steps[0];
    if (!step) return this.end();

    // Consume the active step before running it so a timeout or detected action
    // can never re-enter and double-advance while the step is still in flight.
    this.clearCompletionTimer();
    this.completionFired = true;

    const input = { step, previous: this.output, state, index: state.cursor, controls: this };
    let result: StoryboardTutorialStepResult<C>;
    try {
      result = step.run ? await step.run(input) : undefined;
    } catch (error: unknown) {
      this.abort();
      throw error instanceof Error ? error : new InternalError(String(error));
    }

    this.history.push({ state, output: this.output });

    this.current = this.applyResult(state, step, result);
    // `previous` for the next step is the whole state this step produced.
    this.output = this.current;
    if (!this.current.steps.length) return this.end();
    this.armCompletion();
    this.emit();
    return this.current;
  }

  /**
   * @description Requests completion of the active step using its completion policy.
   * @summary This is the single gated path used by timeout auto-advance, detected
   * user actions, the message bubble's close control and app-driven imperative
   * triggers. It is idempotent (never advances the same step twice) and honours
   * the step's `minTime` floor by deferring an early request until the floor
   * elapses. `next()` remains the explicit, unconditional navigation control.
   * @param reason why the completion is being requested; defaults to `external`.
   * @returns true when the step advanced, false when deferred or ignored.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  async complete(reason: TutorialCompletionReason = 'external'): Promise<boolean> {
    const state = this.current;
    const step = this.active;
    if (!state || state.status !== 'running' || !step) return false;
    if (this.completionFired || step.id !== this.completionStepId) return false;

    const config = this.resolveCompletion(step);
    const minTime = config?.minTime ?? 0;
    const elapsed = this.clock.now() - this.completionStartedAt;
    if (elapsed < minTime) {
      // Defer the request until the minimum-time floor elapses.
      this.clearCompletionTimer();
      this.completionTimer = this.clock.setTimer(() => {
        this.completionTimer = null;
        void this.complete(reason);
      }, minTime - elapsed);
      return false;
    }

    this.completionFired = true;
    this.clearCompletionTimer();
    await this.next();
    return true;
  }

  /**
   * @description Returns to the previous step.
   * @summary Restores the state captured before the last executed step. No-op
   * when there is no history.
   * @returns the restored state.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  previous(): StoryboardTutorialState<C> | null {
    const state = this.current;
    if (!state) return null;
    const entry = this.history.pop();
    if (!entry) return state;
    this.output = entry.output;
    this.current = { ...entry.state, status: 'running' };
    this.armCompletion();
    this.emit();
    return this.current;
  }

  /**
   * @description Jumps to the step with the given id.
   * @param stepId the id of the step to jump to.
   * @returns the resulting state.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  goTo(stepId: string): StoryboardTutorialState<C> | null {
    const state = this.current;
    if (!state) return null;
    const index = state.steps.findIndex((step) => step.id === stepId);
    if (index < 0) throw new NotFoundError(`Storyboard tutorial step "${stepId}" is not in the remaining storyboard`);
    this.history.push({ state, output: this.output });
    this.output = state;
    this.current = { ...state, steps: state.steps.slice(index), cursor: state.cursor + index };
    this.armCompletion();
    this.emit();
    return this.current;
  }

  /**
   * @description Aborts the running tutorial.
   * @returns null, always.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  abort(): StoryboardTutorialState<C> | null {
    const state = this.current;
    if (!state) return null;
    this.clearCompletionTimer();
    this.current = null;
    this.output = undefined;
    this.history = [];
    this.emit('aborted');
    this.scenario?.onAbort?.(state);
    this.scenario = null;
    return null;
  }

  /**
   * @description Ends the running tutorial successfully.
   * @returns null, always.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  end(): StoryboardTutorialState<C> | null {
    const state = this.current;
    if (!state) return null;
    this.clearCompletionTimer();
    this.current = null;
    this.output = undefined;
    this.history = [];
    this.emit('completed');
    this.scenario?.onEnd?.(state);
    this.scenario = null;
    return null;
  }

  /**
   * @description Arms the completion state for the active step.
   * @summary Resets the fired/pending flags, records when the step became active
   * and schedules the auto-advance timer at `max(timeout, minTime)`. Called after
   * every state transition so a timeout is never carried over from a prior step.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  private armCompletion(): void {
    this.clearCompletionTimer();
    this.completionFired = false;
    const state = this.current;
    const step = this.active;
    if (!state || state.status !== 'running' || !step) {
      this.completionStepId = null;
      return;
    }
    this.completionStepId = step.id;
    this.completionStartedAt = this.clock.now();
    const config = this.resolveCompletion(step);
    const timeout = config?.timeout;
    if (timeout === undefined || timeout === null) return;
    const delay = Math.max(timeout, config?.minTime ?? 0);
    this.completionTimer = this.clock.setTimer(() => {
      this.completionTimer = null;
      void this.complete('timeout');
    }, delay);
  }

  /**
   * @description Cancels the active auto-advance timer, when any.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  private clearCompletionTimer(): void {
    if (this.completionTimer === null) return;
    this.clock.clearTimer(this.completionTimer);
    this.completionTimer = null;
  }

  /**
   * @description Resolves the completion policy for a step against the scenario.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  private resolveCompletion(step: StoryboardTutorialStep<C>): TutorialCompletionConfig | undefined {
    return resolveTutorialCompletion(step, this.scenario ?? undefined);
  }

  /**
   * @description Applies a step's result to the storyboard.
   * @param state the state the step executed against.
   * @param step the executed step.
   * @param result the step's return value.
   * @returns the resulting whole storyboard state.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  private applyResult(
    state: StoryboardTutorialState<C>,
    step: StoryboardTutorialStep<C>,
    result: StoryboardTutorialStepResult<C>
  ): StoryboardTutorialState<C> {
    if (result === undefined || result === null) return this.advance(state, step);
    if (Array.isArray(result.steps)) {
      const next = { ...state, ...result } as StoryboardTutorialState<C>;
      if (next.steps[0]?.id === step.id)
        throw new InternalError(
          `Storyboard tutorial step "${step.id}" returned a non-advancing storyboard`
        );
      return next;
    }
    return this.advance({ ...state, ...result } as StoryboardTutorialState<C>, step);
  }

  /**
   * @description Consumes the active step and moves to the next one.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  private advance(
    state: StoryboardTutorialState<C>,
    step: StoryboardTutorialStep<C>
  ): StoryboardTutorialState<C> {
    return {
      ...state,
      steps: state.steps.slice(1),
      cursor: state.cursor + 1,
      completed: [...state.completed, step.id],
    };
  }

  /**
   * @description Emits the current state/status to the host.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.engine
   */
  private emit(status?: TutorialStatus): void {
    if (status) this.lastStatus = status;
    else if (this.current) this.lastStatus = this.current.status;
    this.onChange?.(this.current, this.status);
  }
}
