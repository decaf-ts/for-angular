/**
 * @module for-angular/graph/validation/GraphWorkflowValidityStore.spec
 * @summary Gate-2 P0 #5 (D5) — editor validity projection contract.
 * @description Proves the singleton validity store (DECAF-50 §4.22/D5,
 * §4.24 P0 #5) against the real source module:
 *
 * - `applyResult` sets the lifecycle status, the structured issues, and clears
 *   the transport error; `applyFailure` clears the issues and marks the graph
 *   `unavailable` so a backend outage never blocks Run.
 * - `isInvalid` is true for `invalid`, and for `checking` while prior issues
 *   remain (the re-validation window); false for `valid`/`unavailable`/`idle`.
 * - `invalidNodeIds`/`invalidEdgeIds` derive from issue `nodeId`/`edgeId`.
 * - `validate` drops a stale response superseded by a newer request, and
 *   `validateIfChanged` dedupes an unchanged semantic document.
 */
import {
  graphValidity,
  graphWorkflowValidityLabelOf,
} from './GraphWorkflowValidityStore';
import { graphRunLog } from '../execution/GraphRunLogStore';
import type {
  GraphValidationIssue,
  GraphWorkflowValidationResult,
} from './GraphWorkflowValidateClient';
import type { GraphWorkflowDocument } from '@decaf-ts/ui-decorators/graph';

/** Minimal literal issue. */
function issue(extra: Partial<GraphValidationIssue> = {}): GraphValidationIssue {
  return {
    code: 'graph.node.missing',
    path: 'nodes.0',
    message: 'Node kind is not registered',
    ...extra,
  };
}

/** A canonical document whose only difference is `name` (semantic hash input). */
function document(name: string): GraphWorkflowDocument {
  return {
    id: 'text-pipeline-workflow',
    name,
    inputs: [],
    outputs: [],
    nodes: [],
    edges: [],
  } as never as GraphWorkflowDocument;
}

/** Client stub resolving `result`, capturing the documents it was handed. */
function client(result: GraphWorkflowValidationResult) {
  return { validate: jest.fn(() => Promise.resolve(result)) };
}

describe('GraphWorkflowValidityStore (D5 projection)', () => {
  beforeEach(() => {
    graphValidity.reset();
    graphRunLog.reset();
  });

  afterEach(() => {
    graphRunLog.reset();
  });

  it('starts idle with no issues, no hash, and no error', () => {
    expect(graphValidity.status()).toBe('idle');
    expect(graphValidity.issues()).toEqual([]);
    expect(graphValidity.semanticHash()).toBeNull();
    expect(graphValidity.error()).toBeNull();
    expect(graphValidity.isInvalid()).toBe(false);
    expect(graphValidity.isValid()).toBe(false);
  });

  it('applyResult records an invalid result and its issues', () => {
    graphValidity.applyResult({
      valid: false,
      issues: [issue({ nodeId: 'n1' }), issue({ edgeId: 'e1' })],
    });

    expect(graphValidity.status()).toBe('invalid');
    expect(graphValidity.issues()).toHaveLength(2);
    expect(graphValidity.error()).toBeNull();
    expect(graphValidity.label()).toBe('Invalid');
  });

  it('applyResult records a valid result', () => {
    graphValidity.applyResult({ valid: true, issues: [] });

    expect(graphValidity.status()).toBe('valid');
    expect(graphValidity.isValid()).toBe(true);
    expect(graphValidity.isInvalid()).toBe(false);
  });

  it('isInvalid is true for invalid and false for valid/unavailable/idle', () => {
    graphValidity.applyResult({ valid: false, issues: [issue()] });
    expect(graphValidity.isInvalid()).toBe(true);

    graphValidity.applyResult({ valid: true, issues: [] });
    expect(graphValidity.isInvalid()).toBe(false);

    graphValidity.applyFailure(new Error('down'));
    expect(graphValidity.isInvalid()).toBe(false);

    graphValidity.reset();
    expect(graphValidity.isInvalid()).toBe(false);
  });

  it('isInvalid stays true while re-checking when prior issues remain', async () => {
    graphValidity.applyResult({ valid: false, issues: [issue()] });
    let release!: () => void;
    const pending = new Promise<GraphWorkflowValidationResult>((resolve) => {
      release = () => resolve({ valid: true, issues: [] });
    });
    const stub = { validate: jest.fn(() => pending) };

    const inFlight = graphValidity.validate(document('wf'), stub);
    expect(graphValidity.status()).toBe('checking');
    expect(graphValidity.isInvalid()).toBe(true);

    release();
    await inFlight;
    expect(graphValidity.isInvalid()).toBe(false);
  });

  it('derives invalidNodeIds/invalidEdgeIds from issue nodeId/edgeId', () => {
    graphValidity.applyResult({
      valid: false,
      issues: [
        issue({ nodeId: 'n1' }),
        issue({ nodeId: 'n2' }),
        issue({ edgeId: 'e1' }),
        issue({ nodeId: 'n1', edgeId: 'e2' }),
        issue(),
      ],
    });

    expect([...graphValidity.invalidNodeIds()].sort()).toEqual(['n1', 'n2']);
    expect([...graphValidity.invalidEdgeIds()].sort()).toEqual(['e1', 'e2']);
  });

  it('applyFailure clears the issues and marks the graph unavailable', () => {
    graphValidity.applyResult({ valid: false, issues: [issue({ nodeId: 'n1' })] });

    graphValidity.applyFailure(new Error('backend is down'));

    expect(graphValidity.status()).toBe('unavailable');
    expect(graphValidity.issues()).toEqual([]);
    expect(graphValidity.error()).toBe('backend is down');
    expect(graphValidity.isInvalid()).toBe(false);
  });

  it('validate records the document semantic hash and applies the result', async () => {
    const stub = client({ valid: true, issues: [] });

    const result = await graphValidity.validate(document('one'), stub);

    expect(stub.validate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ valid: true, issues: [] });
    expect(graphValidity.semanticHash()).not.toBeNull();
    expect(graphValidity.status()).toBe('valid');
  });

  it('feeds a validated run-lifecycle line into the log drawer (D6/G3-21)', async () => {
    await graphValidity.validate(document('one'), client({ valid: true, issues: [] }));

    const lines = graphRunLog.lifecycle();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ kind: 'validated', level: 'info' });
    expect(lines[0].message).toContain('text-pipeline-workflow');
  });

  it('feeds a validation-issues run-lifecycle line for an invalid graph (D6/G3-21)', async () => {
    await graphValidity.validate(
      document('one'),
      client({ valid: false, issues: [issue({ nodeId: 'n1' }), issue({ edgeId: 'e1' })] })
    );

    const lines = graphRunLog.lifecycle();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ kind: 'validation-issues', level: 'warn' });
    expect(lines[0].message).toContain('2 issue(s)');
  });

  it('does not feed editor-driven validateIfChanged checks into the run log (D6)', async () => {
    const stub = client({ valid: true, issues: [] });

    await graphValidity.validateIfChanged(document('one'), stub);

    expect(graphRunLog.lifecycle()).toHaveLength(0);
  });

  it('drops a stale response superseded by a newer request (request-sequence guard)', async () => {
    let resolveFirst!: (value: GraphWorkflowValidationResult) => void;
    let resolveSecond!: (value: GraphWorkflowValidationResult) => void;
    const first = new Promise<GraphWorkflowValidationResult>((resolve) => {
      resolveFirst = resolve;
    });
    const second = new Promise<GraphWorkflowValidationResult>((resolve) => {
      resolveSecond = resolve;
    });
    const stub = {
      validate: jest
        .fn()
        .mockImplementationOnce(() => first)
        .mockImplementationOnce(() => second),
    };

    const stale = graphValidity.validate(document('one'), stub);
    const fresh = graphValidity.validate(document('two'), stub);

    // The second request resolves first; the first is now stale.
    resolveSecond({ valid: true, issues: [] });
    await expect(fresh).resolves.toEqual({ valid: true, issues: [] });
    resolveFirst({ valid: false, issues: [issue({ nodeId: 'stale' })] });

    await expect(stale).resolves.toBeNull();
    expect(graphValidity.status()).toBe('valid');
    expect(graphValidity.issues()).toEqual([]);
  });

  it('validateIfChanged skips an unchanged semantic document and re-validates a changed one', async () => {
    const stub = client({ valid: true, issues: [] });

    await graphValidity.validate(document('one'), stub);
    expect(stub.validate).toHaveBeenCalledTimes(1);

    const skipped = await graphValidity.validateIfChanged(document('one'), stub);
    expect(skipped).toBeNull();
    expect(stub.validate).toHaveBeenCalledTimes(1);

    await graphValidity.validateIfChanged(document('two'), stub);
    expect(stub.validate).toHaveBeenCalledTimes(2);
  });

  it('reset clears the projection back to unvalidated', async () => {
    await graphValidity.validate(document('one'), client({ valid: true, issues: [] }));
    graphValidity.applyFailure(new Error('down'));

    graphValidity.reset();

    expect(graphValidity.status()).toBe('idle');
    expect(graphValidity.issues()).toEqual([]);
    expect(graphValidity.semanticHash()).toBeNull();
    expect(graphValidity.error()).toBeNull();
  });

  it('labels every lifecycle status', () => {
    expect(graphWorkflowValidityLabelOf('idle')).toBe('Not validated');
    expect(graphWorkflowValidityLabelOf('checking')).toBe('Checking…');
    expect(graphWorkflowValidityLabelOf('valid')).toBe('Valid');
    expect(graphWorkflowValidityLabelOf('invalid')).toBe('Invalid');
    expect(graphWorkflowValidityLabelOf('unavailable')).toBe('Unavailable');
  });
});
