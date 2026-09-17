/**
 * Gate-2 P0 #4 (D4) — UI data-pinning unit contract.
 *
 * Pinning is **data pinning** (DECAF-50 §4.22 D4/G3-14..15): the pin state is
 * written into the canonical document (never a component-local CSS flag),
 * survives a save/load round-trip, freezes the node's parameter values for
 * downstream runs, and the affordance renders only when the manifest declares
 * the node pinnable. It is never the engine's cache pinning (`GraphPinning`).
 *
 * The `tests/playwright/graph/base-node.spec.ts` (T4) suite asserts the same
 * document-write contract on the running demo, and the 12-step acceptance spine
 * (`canvas-run.spec.ts`) asserts the frozen run submission end-to-end.
 */
import { TestBed } from '@angular/core/testing';
import { ValidationError } from '@decaf-ts/db-decorators';
import type {
  GraphNodeInstance,
  GraphResolvedNodeManifest,
  GraphWorkflowDocument,
} from '@decaf-ts/ui-decorators/graph';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { GraphWorkflowDocumentStore } from './GraphWorkflowDocumentStore';
import { applyGraphDocumentCommand } from './GraphDocumentCommands';
import { graphWorkflowDocumentCanvasModelOf } from './GraphDiagramAdapter';
import type { GraphNodeManifestReader } from '../catalog/GraphNodeCatalogReader';
import {
  graphNodeManifestPinnableOf,
  graphNodePinStateCloneOf,
  graphNodePinStateOf,
  graphNodePinnableOf,
  graphWorkflowDocumentSemanticHashOf,
  graphWorkflowDocumentStringify,
  graphWorkflowDocumentWithPinnedParameters,
  graphWorkflowDocumentWithoutUi,
  graphWorkflowNodeCloneOf,
} from './GraphDocumentSelectors';
import { GraphSaveService } from '../services/GraphSaveService';
import { GRAPH_BACKEND_URL } from '../execution/GraphExecutionService';

const PINNED_AT = '2026-09-16T10:00:00.000Z';

/** One canonical node instance with a nested parameter snapshot. */
function nodeOf(overrides: Partial<GraphNodeInstance> = {}): GraphNodeInstance {
  return {
    id: 'node-1',
    kind: 'core.flow.log',
    label: 'Log',
    parameters: { level: 'info', nested: { a: 1 } },
    ...overrides,
  } as GraphNodeInstance;
}

/** Minimal canonical workflow document carrying the nodes under test. */
function documentOf(nodes: GraphNodeInstance[] = [nodeOf()]): GraphWorkflowDocument {
  return {
    id: 'wf-pin',
    name: 'Pin workflow',
    inputs: [],
    outputs: [],
    nodes,
    edges: [],
  } as GraphWorkflowDocument;
}

/** A fresh store seeded with the document under test. */
function seededStore(nodes: GraphNodeInstance[] = [nodeOf()]): GraphWorkflowDocumentStore {
  const store = new GraphWorkflowDocumentStore();
  store.initialize(documentOf(nodes));
  return store;
}

/** One resolved manifest fixture with optional `metadata.pinnable`. */
function resolvedOf(
  kind: string,
  metadata?: Record<string, unknown>
): GraphResolvedNodeManifest {
  return {
    kind,
    display: { name: kind, category: 'Utility', width: 96, height: 96 },
    inputs: [{ id: 'value', label: 'value', direction: 'input', required: true }],
    outputs: [{ id: 'logged', label: 'logged', direction: 'output', required: true }],
    parameters: [],
    ...(metadata ? { metadata } : {}),
  } as unknown as GraphResolvedNodeManifest;
}

/** Reader over a fixed resolved-manifest list (the adapter's only contract). */
function readerOf(resolved: GraphResolvedNodeManifest[]): GraphNodeManifestReader {
  const byKind = new Map(resolved.map((manifest) => [manifest.kind, manifest]));
  return {
    all: () => resolved.map((manifest) => ({ kind: manifest.kind } as never)),
    get: (kind: string) => (byKind.has(kind) ? ({ kind } as never) : undefined),
    resolve: (instance: GraphNodeInstance) => {
      const found = byKind.get(instance.kind);
      if (!found) throw new Error(`unknown kind '${instance.kind}'`);
      return found;
    },
  };
}

function mockResponse(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(JSON.parse(body)),
  };
}

describe('GraphWorkflowDocumentStore — pin writes the canonical document (D4)', () => {
  it('pinNode writes a frozen parameter snapshot and pinnedAt into document.nodes[i].pinned', () => {
    const store = seededStore();
    expect(store.isNodePinned('node-1')).toBe(false);

    store.pinNode('node-1', PINNED_AT);

    const node = store.document()!.nodes.find((candidate) => candidate.id === 'node-1')!;
    expect(node.pinned).toEqual({
      parameters: { level: 'info', nested: { a: 1 } },
      pinnedAt: PINNED_AT,
    });
    expect(store.isNodePinned('node-1')).toBe(true);
  });

  it('never pins a sibling node', () => {
    const store = seededStore([nodeOf(), nodeOf({ id: 'node-2', label: 'Other' })]);

    store.pinNode('node-1', PINNED_AT);

    expect(store.isNodePinned('node-1')).toBe(true);
    expect(store.isNodePinned('node-2')).toBe(false);
    expect(store.document()!.nodes[1].pinned).toBeUndefined();
  });

  it('unpinNode deletes the document-carried pin state', () => {
    const store = seededStore();
    store.pinNode('node-1', PINNED_AT);

    store.unpinNode('node-1');

    expect(store.document()!.nodes[0].pinned).toBeUndefined();
    expect(store.isNodePinned('node-1')).toBe(false);
  });

  it('refuses to pin an unknown node', () => {
    const store = seededStore();

    expect(() => store.pinNode('missing')).toThrow(ValidationError);
  });

  it('freezes a deep clone: mutating live parameters never rewrites the pin', () => {
    const store = seededStore();
    store.pinNode('node-1', PINNED_AT);

    store.updateNode('node-1', { parameters: { level: 'debug', nested: { a: 2 } } });

    const live = store.document()!.nodes[0];
    // The live `parameters` merge patch keys over the node's existing record.
    expect(live.parameters).toEqual({ level: 'debug', nested: { a: 2 } });
    expect(live.pinned).toEqual({
      parameters: { level: 'info', nested: { a: 1 } },
      pinnedAt: PINNED_AT,
    });
  });
});

describe('pin-state selectors (D4)', () => {
  it('graphNodePinStateOf deep-clones the node parameters', () => {
    const node = nodeOf();
    const state = graphNodePinStateOf(node, PINNED_AT);

    expect(state).toEqual({ parameters: { level: 'info', nested: { a: 1 } }, pinnedAt: PINNED_AT });
    (node.parameters['nested'] as { a: number }).a = 99;
    expect(state.parameters['nested']).toEqual({ a: 1 });
  });

  it('graphNodePinStateOf omits pinnedAt when no timestamp is given', () => {
    expect(graphNodePinStateOf(nodeOf())).toEqual({ parameters: { level: 'info', nested: { a: 1 } } });
  });

  it('graphNodePinStateCloneOf deep-clones the snapshot', () => {
    const state = { parameters: { a: { b: 1 } }, pinnedAt: PINNED_AT };
    const clone = graphNodePinStateCloneOf(state);

    expect(clone).toEqual(state);
    expect(clone).not.toBe(state);
    expect(clone.parameters).not.toBe(state.parameters);
    expect(clone.parameters['a']).not.toBe(state.parameters['a']);
  });

  it('graphWorkflowNodeCloneOf deep-clones the pin state', () => {
    const node = nodeOf({ pinned: { parameters: { a: { b: 1 } }, pinnedAt: PINNED_AT } });
    const clone = graphWorkflowNodeCloneOf(node);

    expect(clone.pinned).toEqual(node.pinned);
    expect(clone.pinned).not.toBe(node.pinned);
    expect(clone.pinned!.parameters).not.toBe(node.pinned!.parameters);
  });

  it('graphWorkflowDocumentWithoutUi keeps the pin in the semantic surface', () => {
    const document = documentOf([nodeOf({ pinned: { parameters: { level: 'info' } } })]);
    const withoutUi = graphWorkflowDocumentWithoutUi(document);

    expect(withoutUi.nodes[0].pinned).toEqual({ parameters: { level: 'info' } });
  });

  it('graphWorkflowDocumentSemanticHashOf changes when a node is pinned', () => {
    const before = graphWorkflowDocumentSemanticHashOf(documentOf());
    const pinned = documentOf([nodeOf({ pinned: { parameters: { level: 'info' } } })]);

    expect(graphWorkflowDocumentSemanticHashOf(pinned)).not.toBe(before);
  });
});

describe('value freeze for downstream runs (D4)', () => {
  it('applies frozen pinned parameters over mutated live parameters', () => {
    const store = seededStore();
    store.pinNode('node-1', PINNED_AT);
    store.updateNode('node-1', { parameters: { level: 'debug', added: true } });

    const frozen = graphWorkflowDocumentWithPinnedParameters(store.document()!);

    // Pinned keys win over the live values; live-only keys survive.
    expect(frozen.nodes[0].parameters).toEqual({
      level: 'info',
      added: true,
      nested: { a: 1 },
    });
    // The live document itself is never mutated by the freeze projection.
    expect(store.document()!.nodes[0].parameters).toEqual({
      level: 'debug',
      added: true,
      nested: { a: 1 },
    });
  });

  it('passes a pin-free document through unchanged (identity)', () => {
    const document = documentOf();

    expect(graphWorkflowDocumentWithPinnedParameters(document)).toBe(document);
  });
});

describe('pinnable gate (D4/G3-14)', () => {
  it('defaults to pinnable when no metadata declares otherwise', () => {
    expect(graphNodePinnableOf(undefined)).toBe(true);
    expect(graphNodePinnableOf({})).toBe(true);
    expect(graphNodeManifestPinnableOf(undefined)).toBe(true);
    expect(graphNodeManifestPinnableOf({})).toBe(true);
  });

  it('keeps a node pinnable for an enabled/manual declaration', () => {
    expect(graphNodePinnableOf({ pinnable: true })).toBe(true);
    expect(graphNodePinnableOf({ pinnable: { enabled: true, strategy: 'manual' } })).toBe(true);
  });

  it('returns false for metadata.pinnable: false', () => {
    expect(graphNodePinnableOf({ pinnable: false })).toBe(false);
    expect(graphNodeManifestPinnableOf({ metadata: { pinnable: false } })).toBe(false);
  });

  it('returns false for metadata.pinnable.enabled: false', () => {
    expect(graphNodePinnableOf({ pinnable: { enabled: false } })).toBe(false);
    expect(graphNodeManifestPinnableOf({ metadata: { pinnable: { enabled: false } } })).toBe(false);
  });

  it('returns false for metadata.pinnable.strategy: "disabled"', () => {
    expect(graphNodePinnableOf({ pinnable: { strategy: 'disabled' } })).toBe(false);
    expect(graphNodeManifestPinnableOf({ metadata: { pinnable: { strategy: 'disabled' } } })).toBe(false);
  });
});

describe('adapter projection (D4/G3-14)', () => {
  it('projects the manifest pinnable flag and the document pin state onto the canvas node data', () => {
    const projection = graphWorkflowDocumentCanvasModelOf(
      documentOf([
        nodeOf({ id: 'node-1', kind: 'core.flow.log', pinned: { parameters: { level: 'info' } } }),
        nodeOf({ id: 'node-2', kind: 'core.flow.code' }),
      ]),
      readerOf([resolvedOf('core.flow.log', { pinnable: false }), resolvedOf('core.flow.code')])
    );

    const pinned = projection.nodes.find((node) => node.id === 'node-1')!;
    const plain = projection.nodes.find((node) => node.id === 'node-2')!;
    expect((pinned.data as { pinnable?: boolean }).pinnable).toBe(false);
    expect((pinned.data as { pinned?: unknown }).pinned).toEqual({ parameters: { level: 'info' } });
    expect((plain.data as { pinnable?: boolean }).pinnable).toBe(true);
    expect((plain.data as { pinned?: unknown }).pinned).toBeUndefined();
  });
});

describe('node.update pin patch validation (D4)', () => {
  it('rejects a malformed pin state', () => {
    expect(() =>
      applyGraphDocumentCommand(documentOf(), {
        type: 'node.update',
        nodeId: 'node-1',
        patch: { pinned: { parameters: 'not-a-record' } as never },
      })
    ).toThrow(ValidationError);
  });

  it('accepts an object pin state and a null clear', () => {
    const pinned = applyGraphDocumentCommand(documentOf(), {
      type: 'node.update',
      nodeId: 'node-1',
      patch: { pinned: { parameters: { level: 'info' } } },
    });
    expect(pinned?.nodes[0].pinned).toEqual({ parameters: { level: 'info' } });

    const cleared = applyGraphDocumentCommand(pinned, {
      type: 'node.update',
      nodeId: 'node-1',
      patch: { pinned: null },
    });
    expect(cleared?.nodes[0].pinned).toBeUndefined();
  });
});

describe('pin affordance is gated on the template (D4/G3-14)', () => {
  it('wraps the pin button in the isPinnable() template gate', () => {
    const template = fs.readFileSync(
      path.resolve(
        __dirname,
        '../components/graph-node-template/graph-node-template.component.html'
      ),
      'utf8'
    );
    const button = template.indexOf('graph-node__btn--pin');
    expect(button).toBeGreaterThan(-1);
    const gate = template.lastIndexOf('@if (isPinnable())', button);
    expect(gate).toBeGreaterThan(-1);
    // Nothing closes the gate between its opening and the pin button: the
    // affordance only renders when `isPinnable()` is true.
    expect(template.slice(gate, button)).not.toContain('}');
  });
});

describe('save/load survival (D4)', () => {
  it('round-trips the pin through graphWorkflowDocumentStringify', () => {
    const store = seededStore();
    store.pinNode('node-1', PINNED_AT);

    const parsed = JSON.parse(
      graphWorkflowDocumentStringify(store.snapshot())
    ) as GraphWorkflowDocument;

    expect(parsed.nodes[0].pinned).toEqual({
      parameters: { level: 'info', nested: { a: 1 } },
      pinnedAt: PINNED_AT,
    });
  });

  it('round-trips the pin through the GraphSaveService canonical wrapper', async () => {
    TestBed.configureTestingModule({
      providers: [
        GraphSaveService,
        GraphWorkflowDocumentStore,
        { provide: GRAPH_BACKEND_URL, useValue: 'http://localhost:3000' },
      ],
    });
    const service = TestBed.inject(GraphSaveService);
    const store = TestBed.inject(GraphWorkflowDocumentStore);
    store.initialize(documentOf());
    store.pinNode('node-1', PINNED_AT);
    const wrapper = { document: store.snapshot() };

    const originalFetch = globalThis.fetch;
    let savedBody: string | undefined;
    globalThis.fetch = jest.fn((url: string, init: RequestInit) => {
      if (init?.method === 'PUT') {
        savedBody = String(init.body);
        return Promise.resolve(
          mockResponse(JSON.stringify({ workflowId: 'wf-pin', savedAt: PINNED_AT }))
        );
      }
      return Promise.resolve(mockResponse(JSON.stringify(wrapper)));
    }) as unknown as typeof globalThis.fetch;

    try {
      await service.saveDocument('wf-pin', wrapper);
      const reloaded = await service.loadDocument('wf-pin');

      const saved = JSON.parse(savedBody!) as { document: GraphWorkflowDocument };
      expect(saved.document.nodes[0].pinned).toEqual({
        parameters: { level: 'info', nested: { a: 1 } },
        pinnedAt: PINNED_AT,
      });
      expect(reloaded?.document.nodes[0].pinned).toEqual({
        parameters: { level: 'info', nested: { a: 1 } },
        pinnedAt: PINNED_AT,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
