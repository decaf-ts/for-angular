/**
 * @module module:lib/components/storyboard-tutorial/storyboard-tutorial.service
 * @description Root-provided storyboard tutorial service.
 * @summary Owns the {@link StoryboardTutorialEngine} and exposes it as reactive
 * signals plus the start/next/previous/abort/end controls. Because the service is
 * provided in root it survives Angular route navigation, so a tutorial can span
 * multiple routes; an optional sessionStorage snapshot additionally lets the host
 * resume the run after a hard reload once it re-supplies the scenario.
 */

import { computed, Injectable, signal } from '@angular/core';
import { BadRequestError } from '@decaf-ts/db-decorators';
import { StoryboardTutorialEngine } from './storyboard-tutorial.engine';
import {
  StoryboardTutorialControls,
  StoryboardTutorialScenario,
  StoryboardTutorialState,
  TUTORIAL_STORAGE_KEY,
  TutorialCompletionReason,
  TutorialContext,
  TutorialStatus,
} from './storyboard-tutorial.types';

/**
 * @description Serializable snapshot of a running tutorial.
 * @summary Steps carry functions and are not persisted; only the fields needed
 * to rebuild the remaining steps from a registered scenario are stored.
 * @interface PersistedTutorialState
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.service
 */
interface PersistedTutorialState<C extends TutorialContext> {
  scenarioId: string;
  context: C;
  cursor: number;
  completed: string[];
}

/**
 * @description Reactive facade over the storyboard tutorial engine.
 * @summary Holds the running scenario in memory for the lifetime of the Angular
 * application, mirrors the state/status into signals for the host component, and
 * persists a serializable snapshot so a reload can resume the run.
 * @class StoryboardTutorialService
 * @template C the tutorial context type
 * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.service
 */
@Injectable({ providedIn: 'root' })
export class StoryboardTutorialService<C extends TutorialContext = TutorialContext> {
  /** The current whole storyboard state, or null when no tutorial is running. */
  readonly state = signal<StoryboardTutorialState<C> | null>(null);

  /** The current lifecycle status. */
  readonly status = signal<TutorialStatus>('idle');

  /** The currently active step, or null when no tutorial is running. */
  readonly active = computed(() => this.state()?.steps[0] ?? null);

  /** True while a tutorial is running. */
  readonly isRunning = computed(() => this.status() === 'running' && !!this.active());

  /** Whether snapshots are written to sessionStorage; overridable at bind time. */
  private persistEnabled: boolean = true;

  /** The wrapped engine owning the actual run state. */
  private readonly engine = new StoryboardTutorialEngine<C>((state, status) =>
    this.handleChange(state, status)
  );

  /**
   * @description Controls surface handed to steps, strategies and the host.
   * @returns the engine as a controls implementation.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.service
   */
  get controls(): StoryboardTutorialControls<C> {
    return this.engine;
  }

  /**
   * @description Registers a scenario and resumes or starts it.
   * @summary Called by the host component whenever a scenario input is bound. It
   * registers the scenario so a persisted run can be rebuilt, restores the run when
   * a snapshot for the same scenario exists and no run is already in memory, and
   * otherwise starts the run when `autoStart` is requested.
   * @param scenario the scenario to bind.
   * @param options binding options (`persist` and `autoStart`).
   * @returns the current state, or null when no run is active.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.service
   */
  bind(
    scenario: StoryboardTutorialScenario<C>,
    options: { persist?: boolean; autoStart?: boolean } = {}
  ): StoryboardTutorialState<C> | null {
    if (!scenario?.id) throw new BadRequestError('A storyboard tutorial scenario requires an id');
    this.engine.register(scenario);
    if (options.persist !== undefined) this.persistEnabled = options.persist;
    if (scenario.persist !== undefined) this.persistEnabled = scenario.persist;

    if (this.state()) return this.state();
    const snapshot = this.readSnapshot(scenario.id);
    if (snapshot) return this.engine.restore(scenario, snapshot);
    if (options.autoStart) return this.start(scenario);
    return null;
  }

  /**
   * @description Starts a scenario.
   * @param scenarioOrId the scenario instance or a registered scenario id.
   * @param context optional initial context overriding the scenario's own.
   * @returns the initial storyboard state.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.service
   */
  start(
    scenarioOrId: StoryboardTutorialScenario<C> | string,
    context?: C
  ): StoryboardTutorialState<C> {
    return this.engine.start(scenarioOrId, context);
  }

  /**
   * @description Advances to the next step.
   * @returns the resulting state, or null when the tutorial ended.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.service
   */
  next(): Promise<StoryboardTutorialState<C> | null> {
    return this.engine.next();
  }

  /**
   * @description Requests completion of the active step using its completion policy.
   * @summary Config-aware and idempotent counterpart to {@link next}: used by
   * timeouts, detected user actions, the message bubble's close control and
   * app-driven imperative triggers. It honours the step's `minTime` floor.
   * @param reason why the completion is being requested.
   * @returns true when the step advanced, false when deferred or ignored.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.service
   */
  complete(reason?: TutorialCompletionReason): Promise<boolean> {
    return this.engine.complete(reason);
  }

  /**
   * @description Returns to the previous step.
   * @returns the restored state.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.service
   */
  previous(): StoryboardTutorialState<C> | null {
    return this.engine.previous();
  }

  /**
   * @description Jumps to a step by id.
   * @param stepId the target step id.
   * @returns the resulting state.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.service
   */
  goTo(stepId: string): StoryboardTutorialState<C> | null {
    return this.engine.goTo(stepId);
  }

  /**
   * @description Aborts the running tutorial.
   * @returns null, always.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.service
   */
  abort(): StoryboardTutorialState<C> | null {
    return this.engine.abort();
  }

  /**
   * @description Ends the running tutorial successfully.
   * @returns null, always.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.service
   */
  end(): StoryboardTutorialState<C> | null {
    return this.engine.end();
  }

  /**
   * @description Clears any persisted snapshot.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.service
   */
  clearPersisted(): void {
    this.writeSnapshot(null);
  }

  /**
   * @description Reacts to an engine transition.
   * @summary Mirrors the state and status into signals and persists or clears
   * the serializable snapshot.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.service
   */
  private handleChange(
    state: StoryboardTutorialState<C> | null,
    status: TutorialStatus
  ): void {
    this.state.set(state);
    this.status.set(status);
    this.writeSnapshot(state);
  }

  /**
   * @description Reads a persisted snapshot for the given scenario.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.service
   */
  private readSnapshot(scenarioId: string): PersistedTutorialState<C> | null {
    const storage = this.storage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(TUTORIAL_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedTutorialState<C>;
      if (parsed?.scenarioId !== scenarioId) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * @description Persists the serializable part of the current state.
   * @summary Steps carry functions and are not serializable; only the scenario id,
   * context, cursor and completed ids are persisted. On restore the remaining steps
   * are rebuilt from the scenario, so steps inserted dynamically before a hard
   * reload are not restored.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.service
   */
  private writeSnapshot(state: StoryboardTutorialState<C> | null): void {
    if (!this.persistEnabled) return;
    const storage = this.storage();
    if (!storage) return;
    try {
      if (!state || state.status !== 'running') {
        storage.removeItem(TUTORIAL_STORAGE_KEY);
        return;
      }
      const snapshot: PersistedTutorialState<C> = {
        scenarioId: state.scenarioId,
        context: state.context,
        cursor: state.cursor,
        completed: state.completed,
      };
      storage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Storage can be unavailable or full (private mode, SSR); persistence is
      // best-effort and never blocks the in-memory run.
    }
  }

  /**
   * @description Resolves the sessionStorage, when available.
   * @memberOf module:lib/components/storyboard-tutorial/storyboard-tutorial.service
   */
  private storage(): Storage | null {
    try {
      return globalThis.sessionStorage ?? null;
    } catch {
      return null;
    }
  }
}
