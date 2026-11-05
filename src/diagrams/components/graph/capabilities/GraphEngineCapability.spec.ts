/**
 * @module for-angular/graph/capabilities/GraphEngineCapability.spec
 * @summary SAA-219 — pure capability-helper contract.
 * @description Proves the manifest feature-resolution helpers the toolbar and the
 * workflow picker gate on:
 *
 * - verdict/feature guards accept only the known verdict strings and well-formed
 *   capability rows;
 * - feature keys are normalized (case- and separator-insensitive) and alias matching
 *   is tolerant in both directions while rejecting aliases that are too short;
 * - a missing engine or capability yields `undefined`/`false`, and only a
 *   `SUPPORTED` verdict enables a feature (`EXTENSION_POINT`/`NOT_SUPPORTED` do
 *   not);
 * - {@link graphEngineFeatureVerdictOf} prefers a `SUPPORTED` row over a fallback
 *   row, and returns the first fallback otherwise.
 */
import {
  GRAPH_ENGINE_FEATURE_VERDICTS,
  GRAPH_ENGINE_WORKFLOW_LIST_FEATURE,
  GRAPH_ENGINE_WORKFLOW_LOOKUP_FEATURE,
  graphEngineFeatureKeyOf,
  graphEngineFeatureMatches,
  graphEngineFeatureVerdictOf,
  graphEngineSupportsFeature,
  isGraphEngineFeature,
  isGraphEngineFeatureVerdict,
  type GraphEngineDescriptor,
} from './GraphEngineCapability';

/**
 * Builds an engine descriptor with the given capability rows.
 * @param capabilities - The capability rows to attach.
 * @return The descriptor fixture.
 */
function engineWith(
  capabilities: GraphEngineDescriptor['capabilities'],
): GraphEngineDescriptor {
  return {
    engineId: 'engine-1',
    displayName: 'Engine One',
    local: true,
    pinnedEngineVersion: '1.0.0',
    capabilities,
  };
}

describe('GraphEngineCapability — verdict guards', () => {
  it('accepts every declared verdict and rejects everything else', () => {
    for (const verdict of GRAPH_ENGINE_FEATURE_VERDICTS) {
      expect(isGraphEngineFeatureVerdict(verdict)).toBe(true);
    }
    expect(isGraphEngineFeatureVerdict('supported')).toBe(false);
    expect(isGraphEngineFeatureVerdict('UNKNOWN')).toBe(false);
    expect(isGraphEngineFeatureVerdict(null)).toBe(false);
    expect(isGraphEngineFeatureVerdict(42)).toBe(false);
  });

  it('accepts only a non-empty feature with a valid verdict', () => {
    expect(
      isGraphEngineFeature({ feature: 'workflowList', verdict: 'SUPPORTED' }),
    ).toBe(true);
    expect(isGraphEngineFeature({ feature: '', verdict: 'SUPPORTED' })).toBe(false);
    expect(isGraphEngineFeature({ feature: 'workflowList' })).toBe(false);
    expect(
      isGraphEngineFeature({ feature: 'workflowList', verdict: 'SUPPORTED_X' }),
    ).toBe(false);
    expect(isGraphEngineFeature(null)).toBe(false);
    expect(isGraphEngineFeature([])).toBe(false);
  });
});

describe('GraphEngineCapability — feature-key normalization', () => {
  it('normalizes case and separators to the same key', () => {
    expect(graphEngineFeatureKeyOf('workflowList')).toBe('workflowlist');
    expect(graphEngineFeatureKeyOf('workflow_list')).toBe('workflowlist');
    expect(graphEngineFeatureKeyOf('WorkflowList')).toBe('workflowlist');
    expect(graphEngineFeatureKeyOf('  workflow-list ')).toBe('workflowlist');
  });

  it('matches aliases in either direction regardless of case/separators', () => {
    expect(graphEngineFeatureMatches('workflowList', 'workflow_list')).toBe(true);
    expect(graphEngineFeatureMatches('workflowList', 'WorkflowList')).toBe(true);
    expect(graphEngineFeatureMatches('WORKFLOW-LIST', 'workflowlist')).toBe(true);
    expect(graphEngineFeatureMatches('workflowList', 'totallyDifferent')).toBe(
      false,
    );
  });

  it('rejects an empty feature or an alias that is too short to be meaningful', () => {
    expect(graphEngineFeatureMatches('', 'workflowList')).toBe(false);
    expect(graphEngineFeatureMatches('workflowList', 'wf')).toBe(false);
  });
});

describe('GraphEngineCapability — verdict resolution', () => {
  it('returns undefined for a missing engine or missing capabilities', () => {
    expect(
      graphEngineFeatureVerdictOf(undefined, [GRAPH_ENGINE_WORKFLOW_LIST_FEATURE]),
    ).toBeUndefined();
    expect(
      graphEngineFeatureVerdictOf(
        { capabilities: undefined } as unknown as Pick<
          GraphEngineDescriptor,
          'capabilities'
        >,
        [GRAPH_ENGINE_WORKFLOW_LIST_FEATURE],
      ),
    ).toBeUndefined();
  });

  it('returns undefined when no capability matches the aliases', () => {
    const engine = engineWith([
      { feature: 'somethingElse', verdict: 'SUPPORTED' },
    ]);
    expect(
      graphEngineFeatureVerdictOf(engine, [GRAPH_ENGINE_WORKFLOW_LIST_FEATURE]),
    ).toBeUndefined();
  });

  it('resolves a supported capability through a normalized alias', () => {
    const engine = engineWith([
      { feature: 'workflow_list', verdict: 'SUPPORTED' },
    ]);
    expect(
      graphEngineFeatureVerdictOf(engine, [GRAPH_ENGINE_WORKFLOW_LIST_FEATURE]),
    ).toBe('SUPPORTED');
  });

  it('reports a non-SUPPORTED verdict instead of enabling the feature', () => {
    const engine = engineWith([
      { feature: 'workflowList', verdict: 'NOT_SUPPORTED' },
    ]);
    expect(
      graphEngineFeatureVerdictOf(engine, [GRAPH_ENGINE_WORKFLOW_LIST_FEATURE]),
    ).toBe('NOT_SUPPORTED');
    expect(
      graphEngineSupportsFeature(engine, GRAPH_ENGINE_WORKFLOW_LIST_FEATURE),
    ).toBe(false);
  });

  it('treats EXTENSION_POINT as not supported', () => {
    const engine = engineWith([
      { feature: 'workflowList', verdict: 'EXTENSION_POINT' },
    ]);
    expect(
      graphEngineFeatureVerdictOf(engine, [GRAPH_ENGINE_WORKFLOW_LIST_FEATURE]),
    ).toBe('EXTENSION_POINT');
    expect(
      graphEngineSupportsFeature(engine, GRAPH_ENGINE_WORKFLOW_LIST_FEATURE),
    ).toBe(false);
  });

  it('prefers a SUPPORTED row over an earlier fallback row', () => {
    const engine = engineWith([
      { feature: 'workflowList', verdict: 'EXTENSION_POINT' },
      { feature: 'workflow_list', verdict: 'SUPPORTED' },
    ]);
    expect(
      graphEngineFeatureVerdictOf(engine, [GRAPH_ENGINE_WORKFLOW_LIST_FEATURE]),
    ).toBe('SUPPORTED');
  });

  it('keeps the first non-supported row as the fallback verdict', () => {
    const engine = engineWith([
      { feature: 'workflowList', verdict: 'NOT_SUPPORTED' },
      { feature: 'workflow_list', verdict: 'EXTENSION_POINT' },
    ]);
    expect(
      graphEngineFeatureVerdictOf(engine, [GRAPH_ENGINE_WORKFLOW_LIST_FEATURE]),
    ).toBe('NOT_SUPPORTED');
  });

  it('skips malformed capability rows and still resolves a valid row', () => {
    const engine = engineWith([
      { feature: '', verdict: 'SUPPORTED' },
      { feature: 'workflowList', verdict: 'SUPPORTED' },
    ]);
    expect(
      graphEngineFeatureVerdictOf(engine, [GRAPH_ENGINE_WORKFLOW_LIST_FEATURE]),
    ).toBe('SUPPORTED');
  });

  it('enables a feature only for a SUPPORTED verdict', () => {
    expect(
      graphEngineSupportsFeature(
        engineWith([{ feature: 'workflowList', verdict: 'SUPPORTED' }]),
        GRAPH_ENGINE_WORKFLOW_LIST_FEATURE,
      ),
    ).toBe(true);
    expect(
      graphEngineSupportsFeature(
        undefined,
        GRAPH_ENGINE_WORKFLOW_LIST_FEATURE,
      ),
    ).toBe(false);
  });

  it('pins the manifest feature constants', () => {
    expect(GRAPH_ENGINE_WORKFLOW_LIST_FEATURE).toBe('workflowList');
    expect(GRAPH_ENGINE_WORKFLOW_LOOKUP_FEATURE).toBe('workflowLookup');
  });
});
