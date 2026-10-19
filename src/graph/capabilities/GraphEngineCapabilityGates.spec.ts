/**
 * @module for-angular/graph/capabilities/GraphEngineCapabilityGates.spec
 * @summary SAA-707 — pure action-gate resolution contract.
 * @description Proves the capability-driven action gates the graph UI derives
 * from a selected engine's manifest rows:
 *
 * - verdict policy: only an explicit `NOT_SUPPORTED` blocks an affordance;
 *   `SUPPORTED`, `EXTENSION_POINT`, and an undeclared feature all allow it, so a
 *   backend that simply does not mention an action never disables a working
 *   control;
 * - alias matching is backend-agnostic: the generic English aliases resolve
 *   camelCase keys, single words, and human phrases (`list` matches
 *   `"list / inspect existing workflows"`);
 * - {@link graphEngineActionGatesOf} projects every per-action gate, and the
 *   decision never depends on the engine id — three served manifest shapes
 *   (local codeMode, mastra camelCase, dagster human phrases) yield the same UI
 *   decisions through the same pure function.
 */
import type {
  GraphEngineDescriptor,
  GraphEngineFeature,
} from './GraphEngineCapability';
import {
  GRAPH_ENGINE_FEATURE_ALIASES,
  graphEngineActionGatesOf,
  graphEngineFeatureAllowed,
  graphEngineFeatureGateOf,
  type GraphEngineActionGates,
} from './GraphEngineCapabilityGates';

/** A capability-bearing engine slice (the gate functions ignore everything else). */
function engineWith(
  capabilities: GraphEngineFeature[],
): Pick<GraphEngineDescriptor, 'capabilities'> {
  return { capabilities };
}

/** Builds a full descriptor (engineId is irrelevant to gate resolution). */
function descriptor(
  engineId: string,
  capabilities: GraphEngineFeature[],
): GraphEngineDescriptor {
  return {
    engineId,
    displayName: `Engine ${engineId}`,
    local: true,
    pinnedEngineVersion: '1.0.0',
    capabilities,
  };
}

describe('GraphEngineCapabilityGates — verdict policy', () => {
  it('blocks an affordance only on an explicit NOT_SUPPORTED verdict', () => {
    const engine = engineWith([
      { feature: 'workflowRun', verdict: 'NOT_SUPPORTED' },
    ]);

    expect(
      graphEngineFeatureGateOf(engine, GRAPH_ENGINE_FEATURE_ALIASES.workflowRun),
    ).toBe('blocked');
    expect(
      graphEngineFeatureAllowed(
        engine,
        GRAPH_ENGINE_FEATURE_ALIASES.workflowRun,
      ),
    ).toBe(false);
  });

  it('allows an affordance declared SUPPORTED', () => {
    const engine = engineWith([
      { feature: 'workflowRun', verdict: 'SUPPORTED' },
    ]);

    expect(
      graphEngineFeatureGateOf(engine, GRAPH_ENGINE_FEATURE_ALIASES.workflowRun),
    ).toBe('allowed');
    expect(
      graphEngineFeatureAllowed(
        engine,
        GRAPH_ENGINE_FEATURE_ALIASES.workflowRun,
      ),
    ).toBe(true);
  });

  it('allows an affordance reachable only through an EXTENSION_POINT', () => {
    const engine = engineWith([
      { feature: 'workflowCreate', verdict: 'EXTENSION_POINT' },
    ]);

    expect(
      graphEngineFeatureGateOf(
        engine,
        GRAPH_ENGINE_FEATURE_ALIASES.workflowCreate,
      ),
    ).toBe('allowed');
  });

  it('allows an undeclared affordance (fail open, not closed)', () => {
    expect(
      graphEngineFeatureAllowed(
        engineWith([]),
        GRAPH_ENGINE_FEATURE_ALIASES.workflowDelete,
      ),
    ).toBe(true);
    expect(
      graphEngineFeatureAllowed(
        engineWith([{ feature: 'unrelated', verdict: 'NOT_SUPPORTED' }]),
        GRAPH_ENGINE_FEATURE_ALIASES.workflowDelete,
      ),
    ).toBe(true);
  });

  it('allows when no engine is selected', () => {
    expect(
      graphEngineFeatureGateOf(undefined, GRAPH_ENGINE_FEATURE_ALIASES.workflowRun),
    ).toBe('allowed');
  });

  it('lets a SUPPORTED row win over an earlier NOT_SUPPORTED fallback', () => {
    const engine = engineWith([
      { feature: 'workflowRun', verdict: 'NOT_SUPPORTED' },
      { feature: 'runWorkflow', verdict: 'SUPPORTED' },
    ]);

    expect(
      graphEngineFeatureAllowed(
        engine,
        GRAPH_ENGINE_FEATURE_ALIASES.workflowRun,
      ),
    ).toBe(true);
  });
});

describe('GraphEngineCapabilityGates — alias matching', () => {
  it('matches a single-word alias against a human phrase', () => {
    const engine = engineWith([
      { feature: 'list / inspect existing workflows', verdict: 'NOT_SUPPORTED' },
    ]);

    expect(
      graphEngineFeatureAllowed(engine, GRAPH_ENGINE_FEATURE_ALIASES.workflowList),
    ).toBe(false);
  });

  it('matches the "execute" alias against a launch-run phrase', () => {
    const engine = engineWith([
      {
        feature: 'execute existing workflow (launch run)',
        verdict: 'NOT_SUPPORTED',
      },
    ]);

    expect(
      graphEngineFeatureAllowed(engine, GRAPH_ENGINE_FEATURE_ALIASES.workflowRun),
    ).toBe(false);
  });

  it('matches "suspend / resume" and the camelCase "suspendResume" alias', () => {
    const phrase = engineWith([
      { feature: 'suspend / resume', verdict: 'NOT_SUPPORTED' },
    ]);
    const camel = engineWith([
      { feature: 'suspendResume', verdict: 'NOT_SUPPORTED' },
    ]);

    expect(
      graphEngineFeatureAllowed(
        phrase,
        GRAPH_ENGINE_FEATURE_ALIASES.workflowResume,
      ),
    ).toBe(false);
    expect(
      graphEngineFeatureAllowed(
        camel,
        GRAPH_ENGINE_FEATURE_ALIASES.workflowResume,
      ),
    ).toBe(false);
  });

  it('does not match an unrelated feature name', () => {
    const engine = engineWith([
      { feature: 'totallyDifferentThing', verdict: 'NOT_SUPPORTED' },
    ]);

    expect(
      graphEngineFeatureAllowed(engine, GRAPH_ENGINE_FEATURE_ALIASES.workflowRun),
    ).toBe(true);
  });

  it('pins the generic alias sets to the canonical feature keys', () => {
    expect(GRAPH_ENGINE_FEATURE_ALIASES.workflowList).toContain('workflowList');
    expect(GRAPH_ENGINE_FEATURE_ALIASES.workflowCreate).toContain(
      'workflowCreate',
    );
    expect(GRAPH_ENGINE_FEATURE_ALIASES.workflowUpdate).toContain('saveWorkflow');
    expect(GRAPH_ENGINE_FEATURE_ALIASES.workflowDelete).toContain('delete');
    expect(GRAPH_ENGINE_FEATURE_ALIASES.workflowRun).toContain('execute');
    expect(GRAPH_ENGINE_FEATURE_ALIASES.runEventStream).toContain('events');
    expect(GRAPH_ENGINE_FEATURE_ALIASES.workflowResume).toContain(
      'suspendResume',
    );
  });
});

describe('GraphEngineCapabilityGates — action-gate projection', () => {
  it('projects every gate as allowed when nothing is declared', () => {
    const expected: GraphEngineActionGates = {
      browseWorkflows: true,
      lookupWorkflow: true,
      createWorkflow: true,
      updateWorkflow: true,
      deleteWorkflow: true,
      runWorkflow: true,
      streamRunEvents: true,
      resumeWorkflow: true,
    };

    expect(graphEngineActionGatesOf(undefined)).toEqual(expected);
    expect(graphEngineActionGatesOf(engineWith([]))).toEqual(expected);
  });

  it('blocks each action independently from its own explicit refusal', () => {
    const engine = engineWith([
      { feature: 'workflowList', verdict: 'SUPPORTED' },
      { feature: 'workflowLookup', verdict: 'NOT_SUPPORTED' },
      { feature: 'workflowCreate', verdict: 'NOT_SUPPORTED' },
      { feature: 'workflowUpdate', verdict: 'NOT_SUPPORTED' },
      { feature: 'workflowDelete', verdict: 'NOT_SUPPORTED' },
      { feature: 'workflowRun', verdict: 'NOT_SUPPORTED' },
      { feature: 'runEventStream', verdict: 'NOT_SUPPORTED' },
      { feature: 'workflowResume', verdict: 'NOT_SUPPORTED' },
    ]);

    expect(graphEngineActionGatesOf(engine)).toEqual({
      browseWorkflows: true,
      lookupWorkflow: false,
      createWorkflow: false,
      updateWorkflow: false,
      deleteWorkflow: false,
      runWorkflow: false,
      streamRunEvents: false,
      resumeWorkflow: false,
    });
  });
});

describe('GraphEngineCapabilityGates — backend-agnostic manifest shapes (SAA-707)', () => {
  /** Local engine: native code mode with list/lookup, no authoring refusals. */
  const LOCAL: GraphEngineFeature[] = [
    { feature: 'codeMode', verdict: 'SUPPORTED' },
    { feature: 'workflowList', verdict: 'SUPPORTED' },
    { feature: 'workflowLookup', verdict: 'SUPPORTED' },
  ];

  /** Mastra engine: camelCase keys, authoring/resume refused. */
  const MASTRA: GraphEngineFeature[] = [
    { feature: 'workflowCreate', verdict: 'NOT_SUPPORTED' },
    { feature: 'workflowUpdate', verdict: 'NOT_SUPPORTED' },
    { feature: 'workflowDelete', verdict: 'NOT_SUPPORTED' },
    { feature: 'suspendResume', verdict: 'NOT_SUPPORTED' },
  ];

  /** Dagster engine: human phrases for the same decisions. */
  const DAGSTER: GraphEngineFeature[] = [
    { feature: 'list / inspect existing workflows', verdict: 'SUPPORTED' },
    {
      feature: 'execute existing workflow (launch run)',
      verdict: 'NOT_SUPPORTED',
    },
    { feature: 'suspend / resume', verdict: 'NOT_SUPPORTED' },
  ];

  it('resolves the local codeMode manifest: browse + lookup allowed, rest default-allow', () => {
    expect(graphEngineActionGatesOf(engineWith(LOCAL))).toEqual({
      browseWorkflows: true,
      lookupWorkflow: true,
      createWorkflow: true,
      updateWorkflow: true,
      deleteWorkflow: true,
      runWorkflow: true,
      streamRunEvents: true,
      resumeWorkflow: true,
    });
  });

  it('resolves the mastra camelCase manifest: authoring + resume blocked, run allowed', () => {
    expect(graphEngineActionGatesOf(engineWith(MASTRA))).toEqual({
      browseWorkflows: true,
      lookupWorkflow: true,
      createWorkflow: false,
      updateWorkflow: false,
      deleteWorkflow: false,
      runWorkflow: true,
      streamRunEvents: true,
      resumeWorkflow: false,
    });
  });

  it('resolves the dagster human-phrase manifest: run + resume blocked, browse allowed', () => {
    expect(graphEngineActionGatesOf(engineWith(DAGSTER))).toEqual({
      browseWorkflows: true,
      lookupWorkflow: true,
      createWorkflow: true,
      updateWorkflow: true,
      deleteWorkflow: true,
      runWorkflow: false,
      streamRunEvents: true,
      resumeWorkflow: false,
    });
  });

  it('never branches on the engine id: identical capabilities resolve identically', () => {
    const first = descriptor('engine-a', MASTRA);
    const second = descriptor('totally-different-backend', MASTRA);

    expect(graphEngineActionGatesOf(first)).toEqual(
      graphEngineActionGatesOf(second),
    );
    expect(graphEngineActionGatesOf(first).createWorkflow).toBe(false);
  });
});
