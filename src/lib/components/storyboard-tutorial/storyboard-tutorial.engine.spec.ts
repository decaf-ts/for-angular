/**
 * @module module:lib/components/storyboard-tutorial/storyboard-tutorial.engine.spec
 * @description Unit spec for the framework-agnostic storyboard tutorial engine.
 * @summary Covers step chaining, mid-storyboard mutation (insert/skip/context),
 * the non-advancing guard, history navigation, terminal transitions and restore.
 */

import { BadRequestError, InternalError, NotFoundError } from '@decaf-ts/db-decorators';
import { StoryboardTutorialClock, StoryboardTutorialEngine } from './storyboard-tutorial.engine';
import type {
  StoryboardTutorialScenario,
  StoryboardTutorialState,
  StoryboardTutorialStep,
  StoryboardTutorialStepInput,
} from './storyboard-tutorial.types';

type Ctx = { count: number; [key: string]: unknown };

class FakeClock implements StoryboardTutorialClock {
  private time = 0;
  private nextId = 1;
  private readonly timers = new Map<number, { at: number; handler: () => void }>();

  now(): number {
    return this.time;
  }

  setTimer(handler: () => void, delay: number): unknown {
    const id = this.nextId++;
    this.timers.set(id, { at: this.time + delay, handler });
    return id;
  }

  clearTimer(handle: unknown): void {
    this.timers.delete(handle as number);
  }

  async advance(ms: number): Promise<void> {
    this.time += ms;
    for (let round = 0; round < 10; round++) {
      const due = [...this.timers.entries()]
        .filter(([, timer]) => timer.at <= this.time)
        .sort((a, b) => a[1].at - b[1].at);
      if (!due.length) return;
      due.forEach(([id]) => this.timers.delete(id));
      due.forEach(([, timer]) => timer.handler());
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}

function idsOf(state: StoryboardTutorialState<Ctx> | null): string[] {
  return state?.steps.map((step) => step.id) ?? [];
}

function ids(state: StoryboardTutorialState<Ctx> | null): string[] {
  return state?.steps.map((step) => step.id) ?? [];
}

function advance(input: StoryboardTutorialStepInput<Ctx>): StoryboardTutorialState<Ctx> {
  return {
    ...input.state,
    steps: input.state.steps.slice(1),
    cursor: input.state.cursor + 1,
    completed: [...input.state.completed, input.step.id],
  };
}

describe('StoryboardTutorialEngine', () => {
  it('passes the scenario initial context to step 1 and the whole remaining state to each step', async () => {
    const inputs: StoryboardTutorialStepInput<Ctx>[] = [];
    const scenario: StoryboardTutorialScenario<Ctx> = {
      id: 'chain',
      context: { count: 0 },
      steps: [
        {
          id: 'one',
          run: (input) => {
            inputs.push(input);
          },
        },
        {
          id: 'two',
          run: (input) => {
            inputs.push(input);
          },
        },
      ],
    };
    const engine = new StoryboardTutorialEngine<Ctx>();

    engine.start(scenario);
    await engine.next();
    await engine.next();

    expect(inputs).toHaveLength(2);
    expect(inputs[0].previous).toBeUndefined();
    expect(inputs[0].step.id).toBe('one');
    expect(inputs[0].index).toBe(0);
    expect(inputs[0].state.context).toEqual({ count: 0 });
    expect(ids(inputs[0].state)).toEqual(['one', 'two']);
    expect(inputs[0].state.cursor).toBe(0);
    expect(inputs[0].state.completed).toEqual([]);

    expect(inputs[1].step.id).toBe('two');
    expect(inputs[1].index).toBe(1);
    expect(ids(inputs[1].state)).toEqual(['two']);
    expect(inputs[1].state.cursor).toBe(1);
    expect(inputs[1].state.completed).toEqual(['one']);
  });

  it("hands the previous step's output to the next step as input.previous", async () => {
    const inputs: StoryboardTutorialStepInput<Ctx>[] = [];
    const scenario: StoryboardTutorialScenario<Ctx> = {
      id: 'chain-output',
      context: { count: 0 },
      steps: [
        {
          id: 'one',
          run: (input) => {
            inputs.push(input);
            return { ...advance(input), context: { count: 1 } };
          },
        },
        {
          id: 'two',
          run: (input) => {
            inputs.push(input);
          },
        },
      ],
    };
    const engine = new StoryboardTutorialEngine<Ctx>();

    engine.start(scenario);
    await engine.next();
    await engine.next();

    expect(inputs[1].previous).toBeDefined();
    expect(inputs[1].previous?.context).toEqual({ count: 1 });
    expect(ids(inputs[1].previous ?? null)).toEqual(['two']);
    expect(inputs[1].previous?.cursor).toBe(1);
    expect(inputs[1].previous?.completed).toEqual(['one']);
  });

  it('inserts a step when a step returns a rewritten steps array', async () => {
    const inserted: StoryboardTutorialStep<Ctx> = { id: 'inserted' };
    const scenario: StoryboardTutorialScenario<Ctx> = {
      id: 'insert',
      steps: [{ id: 'one' }, { id: 'two' }],
    };
    const engine = new StoryboardTutorialEngine<Ctx>();

    engine.start(scenario);
    const step = scenario.steps[0];
    step.run = (input) => ({
      ...input.state,
      steps: [inserted, ...input.state.steps.slice(1)],
    });

    const state = await engine.next();

    expect(ids(state)).toEqual(['inserted', 'two']);
    expect(state?.cursor).toBe(0);
    expect(state?.completed).toEqual([]);
  });

  it('skips later steps when a step returns a sliced steps array', async () => {
    const scenario: StoryboardTutorialScenario<Ctx> = {
      id: 'skip',
      steps: [{ id: 'one' }, { id: 'two' }, { id: 'three' }],
    };
    const engine = new StoryboardTutorialEngine<Ctx>();

    engine.start(scenario);
    scenario.steps[0].run = (input) => ({
      ...input.state,
      steps: input.state.steps.slice(2),
      cursor: input.state.cursor + 2,
      completed: [...input.state.completed, 'one', 'two'],
    });

    const state = await engine.next();

    expect(ids(state)).toEqual(['three']);
    expect(state?.cursor).toBe(2);
    expect(state?.completed).toEqual(['one', 'two']);
  });

  it('updates the context for the next step through a partial result', async () => {
    const inputs: StoryboardTutorialStepInput<Ctx>[] = [];
    const scenario: StoryboardTutorialScenario<Ctx> = {
      id: 'context',
      context: { count: 0 },
      steps: [
        { id: 'one', run: () => ({ context: { count: 9 } }) },
        {
          id: 'two',
          run: (input) => {
            inputs.push(input);
          },
        },
      ],
    };
    const engine = new StoryboardTutorialEngine<Ctx>();

    engine.start(scenario);
    await engine.next();
    await engine.next();

    expect(inputs[0].state.context).toEqual({ count: 9 });
  });

  it('rejects a full state that keeps the executed step active', async () => {
    const scenario: StoryboardTutorialScenario<Ctx> = {
      id: 'non-advancing',
      steps: [{ id: 'one' }, { id: 'two' }],
    };
    const engine = new StoryboardTutorialEngine<Ctx>();
    engine.start(scenario);
    scenario.steps[0].run = (input) => ({ ...input.state, context: { count: 1 } });

    await expect(engine.next()).rejects.toThrow(InternalError);
  });

  it('restores the prior state with previous()', async () => {
    const scenario: StoryboardTutorialScenario<Ctx> = {
      id: 'history',
      steps: [{ id: 'one' }, { id: 'two' }, { id: 'three' }],
    };
    const engine = new StoryboardTutorialEngine<Ctx>();

    engine.start(scenario);
    await engine.next();
    const afterSecond = await engine.next();
    expect(ids(afterSecond)).toEqual(['three']);

    const restored = engine.previous();

    expect(ids(restored)).toEqual(['two', 'three']);
    expect(restored?.completed).toEqual(['one']);
    expect(restored?.cursor).toBe(1);
  });

  it('jumps to a step with goTo(id) and reports unknown ids', () => {
    const scenario: StoryboardTutorialScenario<Ctx> = {
      id: 'goto',
      steps: [{ id: 'one' }, { id: 'two' }, { id: 'three' }],
    };
    const engine = new StoryboardTutorialEngine<Ctx>();
    engine.start(scenario);

    const jumped = engine.goTo('three');

    expect(ids(jumped)).toEqual(['three']);
    expect(jumped?.cursor).toBe(2);
    expect(() => engine.goTo('missing')).toThrow(NotFoundError);
  });

  it('emits aborted and clears the state on abort()', () => {
    const changes: Array<[StoryboardTutorialState<Ctx> | null, string]> = [];
    const onAbort = jest.fn();
    const scenario: StoryboardTutorialScenario<Ctx> = {
      id: 'abort',
      steps: [{ id: 'one' }],
      onAbort,
    };
    const engine = new StoryboardTutorialEngine<Ctx>((state, status) => changes.push([state, status]));
    engine.start(scenario);

    const result = engine.abort();

    expect(result).toBeNull();
    expect(engine.state).toBeNull();
    expect(engine.active).toBeNull();
    expect(engine.status).toBe('aborted');
    expect(onAbort).toHaveBeenCalledTimes(1);
    expect(changes.at(-1)?.[0]).toBeNull();
    expect(changes.at(-1)?.[1]).toBe('aborted');
  });

  it('emits completed and clears the state on end()', async () => {
    const changes: Array<[StoryboardTutorialState<Ctx> | null, string]> = [];
    const onEnd = jest.fn();
    const scenario: StoryboardTutorialScenario<Ctx> = {
      id: 'end',
      steps: [{ id: 'one' }],
      onEnd,
    };
    const engine = new StoryboardTutorialEngine<Ctx>((state, status) => changes.push([state, status]));
    engine.start(scenario);

    await engine.next();

    expect(engine.state).toBeNull();
    expect(engine.status).toBe('completed');
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(changes.at(-1)?.[0]).toBeNull();
    expect(changes.at(-1)?.[1]).toBe('completed');
  });

  it('restores a persisted snapshot from completed ids and the registered scenario', () => {
    const scenario: StoryboardTutorialScenario<Ctx> = {
      id: 'restore',
      context: { count: 0 },
      steps: [{ id: 'one' }, { id: 'two' }, { id: 'three' }, { id: 'four' }],
    };
    const engine = new StoryboardTutorialEngine<Ctx>();

    const state = engine.restore(scenario, {
      context: { count: 7 },
      cursor: 2,
      completed: ['one', 'two'],
    });

    expect(engine.registered('restore')).toBe(scenario);
    expect(ids(state)).toEqual(['three', 'four']);
    expect(state.context).toEqual({ count: 7 });
    expect(state.cursor).toBe(2);
    expect(state.completed).toEqual(['one', 'two']);
    expect(state.status).toBe('running');
  });

  it('requires an id to register a scenario and rejects starting an unknown id', () => {
    const engine = new StoryboardTutorialEngine<Ctx>();

    expect(() => engine.register({ id: '', steps: [] })).toThrow(BadRequestError);
    expect(() => engine.start('missing')).toThrow(NotFoundError);
  });

  describe('pluggable completion', () => {
    it('auto-advances a step after its timeout', async () => {
      const clock = new FakeClock();
      const engine = new StoryboardTutorialEngine<Ctx>(undefined, clock);
      engine.start({
        id: 'timeout',
        steps: [{ id: 'one', completion: { timeout: 1000 } }, { id: 'two' }],
      });

      expect(engine.active?.id).toBe('one');
      await clock.advance(999);
      expect(engine.active?.id).toBe('one');

      await clock.advance(1);
      expect(engine.active?.id).toBe('two');
    });

    it('honours the minimum time when a manual close arrives early', async () => {
      const clock = new FakeClock();
      const engine = new StoryboardTutorialEngine<Ctx>(undefined, clock);
      engine.start({
        id: 'min-time',
        steps: [{ id: 'one', completion: { minTime: 1000 } }, { id: 'two' }],
      });

      expect(await engine.complete('close')).toBe(false);
      expect(engine.active?.id).toBe('one');

      await clock.advance(1000);
      expect(engine.active?.id).toBe('two');
    });

    it('advances immediately on an imperative trigger when there is no minimum time', async () => {
      const engine = new StoryboardTutorialEngine<Ctx>();
      engine.start({ id: 'imperative', steps: [{ id: 'one' }, { id: 'two' }] });

      expect(await engine.complete('external')).toBe(true);
      expect(engine.active?.id).toBe('two');
    });

    it('does not double-advance while a completion is pending', async () => {
      const clock = new FakeClock();
      const engine = new StoryboardTutorialEngine<Ctx>(undefined, clock);
      engine.start({
        id: 'double',
        steps: [
          { id: 'one', completion: { minTime: 1000 } },
          { id: 'two' },
          { id: 'three' },
        ],
      });

      expect(await engine.complete('close')).toBe(false);
      expect(await engine.complete('close')).toBe(false);

      await clock.advance(1000);
      expect(engine.active?.id).toBe('two');

      await clock.advance(10000);
      expect(engine.active?.id).toBe('two');
    });

    it('clears a pending timeout when a completion fires first', async () => {
      const clock = new FakeClock();
      const engine = new StoryboardTutorialEngine<Ctx>(undefined, clock);
      engine.start({
        id: 'any',
        steps: [
          { id: 'one', completion: { timeout: 5000 } },
          { id: 'two' },
          { id: 'three' },
        ],
      });

      expect(await engine.complete('action')).toBe(true);
      expect(engine.active?.id).toBe('two');

      await clock.advance(10000);
      expect(engine.active?.id).toBe('two');
    });

    it('cancels a pending timeout on abort', async () => {
      const clock = new FakeClock();
      const engine = new StoryboardTutorialEngine<Ctx>(undefined, clock);
      engine.start({ id: 'abort-timeout', steps: [{ id: 'one', completion: { timeout: 1000 } }] });

      engine.abort();
      await clock.advance(1000);

      expect(engine.state).toBeNull();
      expect(engine.status).toBe('aborted');
    });

    it('cancels a pending timeout when the step changes', async () => {
      const clock = new FakeClock();
      const engine = new StoryboardTutorialEngine<Ctx>(undefined, clock);
      engine.start({
        id: 'navigation',
        steps: [
          { id: 'one', completion: { timeout: 5000 } },
          { id: 'two', completion: { timeout: 5000 } },
          { id: 'three' },
        ],
      });

      expect(await engine.complete('external')).toBe(true);
      expect(engine.active?.id).toBe('two');

      await clock.advance(5000);
      expect(idsOf(engine.state)).toEqual(['three']);
    });

    it('lets a step override the scenario completion default', async () => {
      const clock = new FakeClock();
      const engine = new StoryboardTutorialEngine<Ctx>(undefined, clock);
      engine.start({
        id: 'override',
        completion: { timeout: 1000 },
        steps: [{ id: 'one', completion: { timeout: 5000 } }, { id: 'two' }],
      });

      await clock.advance(1000);
      expect(engine.active?.id).toBe('one');

      await clock.advance(4000);
      expect(engine.active?.id).toBe('two');
    });
  });
});
