/**
 * DECAF-50 §4.26 R2-1 / §4.4.5 — node property-value hydration contract.
 *
 * The decorated-workflow authoring compiler is catalogue-free: it folds each
 * node's `default<PortId>` metadata into `parameters` but never sees the backend
 * manifest parameter `defaultValue`s. This suite pins the hydration pass that
 * closes that gap once the catalogue manifests are available:
 *
 *  - missing manifest parameter defaults are seeded into `parameters`;
 *  - `default<PortId>` instance metadata fallbacks are seeded into `parameters`
 *    (§4.4.5 rule 6);
 *  - edge-bound data inputs are recorded as `inputBindings[portId] = { mode: "edge" }`
 *    (§4.4.5 rules 1 and 7);
 *  - existing values and bindings always win (idempotent), and the input node is
 *    never mutated (clone-based via `graphWorkflowNodeCloneOf`);
 *  - `buildGraphRendererSnapshot` passes the available manifests through, so the
 *    compiled demo document carries `parameters.code` and `inputBindings.value`.
 *
 * The real-backend assertion lives outside `src/**`
 * (`tests/playwright/graph/text-pipeline-backend.spec.ts`), where the
 * `@decaf-ts/integrations` backend is allowed.
 */
import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type {
  GraphNodeInstance,
  GraphNodeManifest,
  GraphWorkflowDocument,
} from '@decaf-ts/ui-decorators/graph';

import {
  hydrateGraphNodeInstanceValues,
  hydrateGraphWorkflowDocumentValues,
} from './GraphNodeValueHydration';
import { buildGraphRendererModel, buildGraphRendererSnapshot } from '../utils';
import { TextPipelineWorkflow } from '../../app/pages/graph/workflow-root';
import { GRAPH_NODE_MANIFEST_FIXTURES } from '../catalog/GraphNodeManifestFixtures';

const MANIFESTS = GRAPH_NODE_MANIFEST_FIXTURES;

/** One canonical node instance with an empty parameter/binding surface. */
function nodeOf(overrides: Partial<GraphNodeInstance> = {}): GraphNodeInstance {
  return {
    id: 'node-1',
    kind: 'core.flow.code',
    label: 'Node',
    parameters: {},
    ...overrides,
  } as GraphNodeInstance;
}

/** A `core.flow.code` manifest carrying a required `code` code parameter. */
function codeManifestOf(
  overrides: Partial<GraphNodeManifest> = {}
): GraphNodeManifest {
  return {
    kind: 'core.flow.code',
    display: { name: 'Code', category: 'Utility' },
    inputs: [{ id: 'code', label: 'Code', direction: 'input', required: true }],
    outputs: [{ id: 'result', label: 'result', direction: 'output', required: true }],
    parameters: [
      { type: 'code', id: 'code', label: 'Code', required: true, language: 'javascript' },
    ],
    ...overrides,
  } as unknown as GraphNodeManifest;
}

/** A `core.utility.log` manifest carrying a `level` parameter default. */
function logManifestOf(
  overrides: Partial<GraphNodeManifest> = {}
): GraphNodeManifest {
  return {
    kind: 'core.utility.log',
    display: { name: 'Utility Log', category: 'Utility' },
    inputs: [{ id: 'value', label: 'Input value', direction: 'input', required: true }],
    outputs: [{ id: 'logged', label: 'Logged value', direction: 'output', required: true }],
    parameters: [
      { type: 'object', id: 'value', label: 'Input value', required: true },
      { type: 'string', id: 'level', label: 'Log level', defaultValue: 'info' },
    ],
    ...overrides,
  } as unknown as GraphNodeManifest;
}

/** One canonical document carrying the nodes under test. */
function documentOf(
  nodes: GraphNodeInstance[],
  edges: GraphWorkflowDocument['edges'] = []
): GraphWorkflowDocument {
  return {
    id: 'wf-hydrate',
    name: 'Hydration workflow',
    inputs: [],
    outputs: [],
    nodes,
    edges,
  } as GraphWorkflowDocument;
}

describe('hydrateGraphNodeInstanceValues (R2-1)', () => {
  it('seeds a missing manifest parameter defaultValue into parameters', () => {
    const hydrated = hydrateGraphNodeInstanceValues(
      nodeOf(),
      logManifestOf()
    );

    expect(hydrated.parameters['level']).toBe('info');
  });

  it('seeds a default<PortId> instance metadata fallback into parameters', () => {
    const node = nodeOf({
      metadata: { defaultCode: 'return 1;' },
    });

    const hydrated = hydrateGraphNodeInstanceValues(
      node,
      codeManifestOf({ parameters: [] })
    );

    expect(hydrated.parameters['code']).toBe('return 1;');
  });

  it('ignores a blank default<PortId> metadata fallback', () => {
    const node = nodeOf({ metadata: { defaultCode: '   ' } });

    const hydrated = hydrateGraphNodeInstanceValues(
      node,
      codeManifestOf({ parameters: [] })
    );

    expect(hydrated.parameters['code']).toBeUndefined();
  });

  it('prefers a manifest parameter default over the metadata fallback', () => {
    const node = nodeOf({ metadata: { defaultCode: 'metadata' } });
    const manifest = codeManifestOf({
      parameters: [
        { type: 'code', id: 'code', label: 'Code', required: true, language: 'javascript', defaultValue: 'manifest' },
      ],
    });

    const hydrated = hydrateGraphNodeInstanceValues(node, manifest);

    expect(hydrated.parameters['code']).toBe('manifest');
  });

  it('records an edge-bound data input as an edge binding', () => {
    const hydrated = hydrateGraphNodeInstanceValues(
      nodeOf(),
      codeManifestOf({ parameters: [] }),
      new Set(['data'])
    );

    expect(hydrated.inputBindings).toEqual({ data: { mode: 'edge' } });
  });

  it('never overwrites an existing parameter', () => {
    const hydrated = hydrateGraphNodeInstanceValues(
      nodeOf({ parameters: { level: 'debug' } }),
      logManifestOf()
    );

    expect(hydrated.parameters['level']).toBe('debug');
  });

  it('never overwrites an existing binding', () => {
    const node = nodeOf({
      inputBindings: { data: { mode: 'literal', value: 'kept' } },
    });

    const hydrated = hydrateGraphNodeInstanceValues(
      node,
      codeManifestOf({ parameters: [] }),
      new Set(['data'])
    );

    expect(hydrated.inputBindings).toEqual({ data: { mode: 'literal', value: 'kept' } });
  });

  it('is idempotent across repeated hydration passes', () => {
    const once = hydrateGraphNodeInstanceValues(
      nodeOf({ metadata: { defaultCode: 'return 1;' } }),
      logManifestOf(),
      new Set(['data'])
    );
    const twice = hydrateGraphNodeInstanceValues(once, logManifestOf(), new Set(['data']));

    expect(twice.parameters).toEqual(once.parameters);
    expect(twice.inputBindings).toEqual(once.inputBindings);
  });

  it('does not mutate the input node (clone-based)', () => {
    const node = nodeOf({ metadata: { defaultCode: 'return 1;' } });

    const hydrated = hydrateGraphNodeInstanceValues(node, logManifestOf(), new Set(['data']));

    expect(hydrated).not.toBe(node);
    expect(node.parameters).toEqual({});
    expect(node.inputBindings).toBeUndefined();
    expect(node.metadata).toEqual({ defaultCode: 'return 1;' });
  });

  it('deep-clones the seeded default so callers cannot leak it back', () => {
    const manifest = logManifestOf({
      parameters: [
        { type: 'object', id: 'config', label: 'Config', defaultValue: { nested: { a: 1 } } },
      ],
    });

    const hydrated = hydrateGraphNodeInstanceValues(nodeOf(), manifest);
    (hydrated.parameters['config'] as { nested: { a: number } }).nested.a = 99;

    expect(
      (manifest.parameters[0].defaultValue as { nested: { a: number } }).nested.a
    ).toBe(1);
  });

  it('omits inputBindings entirely when no data input is edge-bound', () => {
    const hydrated = hydrateGraphNodeInstanceValues(nodeOf(), logManifestOf());

    expect(hydrated.inputBindings).toBeUndefined();
  });

  it('accepts an undefined manifest (seeds only edge bindings)', () => {
    const hydrated = hydrateGraphNodeInstanceValues(nodeOf(), undefined, new Set(['value']));

    expect(hydrated.parameters).toEqual({});
    expect(hydrated.inputBindings).toEqual({ value: { mode: 'edge' } });
  });
});

describe('hydrateGraphWorkflowDocumentValues (R2-1)', () => {
  it('maps manifests by kind and hydrates every matching node', () => {
    const document = documentOf([
      nodeOf({ id: 'code-node', kind: 'core.flow.code' }),
      nodeOf({ id: 'log-node', kind: 'core.utility.log' }),
    ]);

    const hydrated = hydrateGraphWorkflowDocumentValues(document, [
      codeManifestOf({ parameters: [] }),
      logManifestOf(),
    ]);

    expect(hydrated.nodes.find((node) => node.id === 'code-node')!.parameters['level']).toBeUndefined();
    expect(hydrated.nodes.find((node) => node.id === 'log-node')!.parameters['level']).toBe('info');
  });

  it('passes a node without a manifest through untouched', () => {
    const unknown = nodeOf({ id: 'unknown', kind: 'core.unknown.kind', parameters: { kept: true } });
    const document = documentOf([nodeOf({ id: 'log-node', kind: 'core.utility.log' }), unknown]);

    const hydrated = hydrateGraphWorkflowDocumentValues(document, [logManifestOf()]);

    const passedThrough = hydrated.nodes.find((node) => node.id === 'unknown')!;
    expect(passedThrough.parameters).toEqual({ kept: true });
    expect(passedThrough.inputBindings).toBeUndefined();
  });

  it('returns the document unchanged when there are no manifests', () => {
    const document = documentOf([nodeOf()]);

    expect(hydrateGraphWorkflowDocumentValues(document, [])).toBe(document);
  });

  it('records an edge binding for every node with an incoming data edge', () => {
    const document = documentOf(
      [
        nodeOf({ id: 'source-node', kind: 'core.flow.code' }),
        nodeOf({ id: 'target-node', kind: 'core.flow.log' }),
      ],
      [
        {
          id: 'edge-1',
          type: 'data',
          source: { scope: 'node', nodeId: 'source-node', port: 'result' },
          target: { scope: 'node', nodeId: 'target-node', port: 'value' },
        },
        {
          id: 'edge-2',
          type: 'data',
          source: { scope: 'workflow', port: 'text' },
          target: { scope: 'node', nodeId: 'target-node', port: 'value' },
        },
      ] as GraphWorkflowDocument['edges']
    );

    const hydrated = hydrateGraphWorkflowDocumentValues(document, [logManifestOf()]);
    const target = hydrated.nodes.find((node) => node.id === 'target-node')!;

    expect(target.inputBindings).toEqual({ value: { mode: 'edge' } });
    expect(hydrated.nodes.find((node) => node.id === 'source-node')!.inputBindings).toBeUndefined();
  });

  it('does not mutate the source document', () => {
    const document = documentOf([nodeOf({ kind: 'core.utility.log' })]);

    hydrateGraphWorkflowDocumentValues(document, [logManifestOf()]);

    expect(document.nodes[0].parameters).toEqual({});
    expect(document.nodes[0].inputBindings).toBeUndefined();
  });
});

describe('buildGraphRendererSnapshot manifest pass-through (R2-1)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('carries parameters.code and inputBindings.value on the compiled demo document', () => {
    const injector = TestBed.inject(Injector);
    const inputValues = { count: 1, text: 'Hello\nWorld\nFoo\nBar\nBaz' };
    const model = buildGraphRendererModel(
      TextPipelineWorkflow as never,
      injector,
      inputValues,
      {},
      null,
      MANIFESTS
    );

    const snapshot = buildGraphRendererSnapshot(
      TextPipelineWorkflow as never,
      model,
      inputValues,
      {},
      {},
      MANIFESTS
    );

    const codeNode = snapshot.document.nodes.find((node) => node.id === 'SplitTextCodeNode')!;
    const logNode = snapshot.document.nodes.find((node) => node.id === 'ResultLogNode')!;

    expect(typeof codeNode.parameters['code']).toBe('string');
    expect(String(codeNode.parameters['code'])).toContain('$input.text');
    expect(logNode.inputBindings).toEqual({ value: { mode: 'edge' } });
  });
});
