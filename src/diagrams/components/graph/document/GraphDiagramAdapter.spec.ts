/**
 * Gate-2 P0 #1 (D1) — manifest-authoritative geometry precedence.
 *
 * `nodeUiSizeOf`/`projectedNodeHeightOf` are the single projection point for
 * node geometry. These tests pin the D1 contract: manifest `display` wins over
 * template CSS and over a carried `ui.size`; an instance `ui.size` is honoured
 * only as an explicit user resize; and content-driven growth is evaluated from
 * the manifest's declared, value-driven display rules — never a hardcoded formula.
 */
import type {
  GraphNodeInstance,
  GraphResolvedNodeManifest,
} from '@decaf-ts/as-graph/shared';
import { nodeUiSizeOf, projectedNodeHeightOf } from './GraphDiagramAdapter';

function nodeOf(overrides: Partial<GraphNodeInstance> = {}): GraphNodeInstance {
  return {
    id: 'node-1',
    kind: 'core.flow.switch',
    parameters: {},
    ...overrides,
  } as GraphNodeInstance;
}

function resolvedOf(display: Record<string, unknown>): GraphResolvedNodeManifest {
  return {
    kind: 'core.flow.switch',
    display,
    inputs: [],
    outputs: [],
    parameters: [],
  } as unknown as GraphResolvedNodeManifest;
}

describe('GraphDiagramAdapter — manifest-authoritative geometry (D1/G3-01..03)', () => {
  it('uses the manifest display size and ignores a carried ui.size (no explicit resize)', () => {
    const node = nodeOf({ ui: { position: { x: 0, y: 0 }, size: { width: 50, height: 50 } } });
    const resolved = resolvedOf({ name: 'Switch', width: 120, height: 140 });

    expect(nodeUiSizeOf(node, resolved)).toEqual({ width: 120, height: 140 });
  });

  it('honours ui.size only as an explicit user resize', () => {
    const node = nodeOf({
      ui: { position: { x: 0, y: 0 }, size: { width: 50, height: 60 }, resized: true },
    });
    const resolved = resolvedOf({ name: 'Switch', width: 120, height: 140 });

    expect(nodeUiSizeOf(node, resolved)).toEqual({ width: 50, height: 60 });
  });

  it('falls back to the default size when the manifest declares no geometry', () => {
    const node = nodeOf();
    const resolved = resolvedOf({ name: 'Switch' });

    expect(nodeUiSizeOf(node, resolved)).toEqual({ width: 96, height: 96 });
  });

  it('evaluates content-driven height from the manifest size rule (G3-03)', () => {
    const node = nodeOf({ parameters: { cases: [{}, {}, {}] } });
    const resolved = resolvedOf({
      name: 'Switch',
      width: 120,
      height: 140,
      sizeRules: [
        { type: 'parameterCount', parameter: 'cases', dimension: 'height', perItem: 24 },
      ],
    });

    expect(nodeUiSizeOf(node, resolved)).toEqual({ width: 120, height: 212 });
    expect(projectedNodeHeightOf(node, resolved, 140)).toBe(212);
  });

  it('never applies a hardcoded switch formula without a manifest rule (G3-03)', () => {
    const node = nodeOf({ parameters: { cases: [{}, {}, {}, {}] } });
    const resolved = resolvedOf({ name: 'Switch', width: 120, height: 140 });

    expect(projectedNodeHeightOf(node, resolved, 140)).toBe(140);
  });
});

/**
 * SAA-1363 reqs 10-12: loop ghosts are canvas-only affordances.
 *
 * An EMPTY `core.loop.foreach` projects a virtual "Add node" ghost plus its two
 * containment edges; a loop with a real body projects no ghost at all, and run
 * (execution) projection opts out entirely. Legacy document-carried ghosts and
 * their edges never reach the canvas.
 */
import type {
  GraphEdgeInstance,
  GraphWorkflowDocument,
} from '@decaf-ts/as-graph/shared';
import type { GraphNodeManifestReader } from '../catalog/GraphNodeCatalogReader';
import { graphWorkflowDocumentCanvasModelOf } from './GraphDiagramAdapter';
import { graphLoopChainEdgeId } from './LoopChainRepair';

/** The subset of the projected canvas edge data the loop-chain contract covers. */
interface ProjectedEdgeData {
  label?: string;
  mandatory?: boolean;
  engineEdgeId?: string;
}

function edgeDataOf(edge: { data?: unknown }): ProjectedEdgeData {
  return (edge.data ?? {}) as ProjectedEdgeData;
}

function loopResolved(): GraphResolvedNodeManifest {
  return {
    kind: 'core.loop.foreach',
    display: { name: 'For each', category: 'Control', width: 120, height: 140 },
    inputs: [{ id: 'list', label: 'List', direction: 'input', required: true }],
    outputs: [
      { id: 'item', label: 'Item', direction: 'output', required: true },
      { id: 'done', label: 'Done', direction: 'output', required: true },
    ],
    connections: [{ id: 'loop', label: 'Loop', direction: 'input', required: true }],
    parameters: [],
  } as GraphResolvedNodeManifest;
}

function logResolved(): GraphResolvedNodeManifest {
  return {
    kind: 'core.flow.log',
    display: { name: 'Log', category: 'Utility', width: 96, height: 96 },
    inputs: [{ id: 'value', label: 'Value', direction: 'input', required: true }],
    outputs: [{ id: 'value', label: 'Value', direction: 'output', required: true }],
    parameters: [],
  } as GraphResolvedNodeManifest;
}

function adapterReaderOf(): GraphNodeManifestReader {
  const resolved = [loopResolved(), logResolved()];
  const byKind = new Map(resolved.map((manifest) => [manifest.kind, manifest]));
  return {
    all: () => resolved.map((manifest) => ({ kind: manifest.kind }) as never),
    get: (kind: string) => (byKind.has(kind) ? ({ kind } as never) : undefined),
    resolve: (instance: GraphNodeInstance) => {
      const found = byKind.get(instance.kind);
      if (!found) throw new Error(`unknown kind '${instance.kind}'`);
      return found;
    },
  };
}

function loopDocument(body: string[] = []): GraphWorkflowDocument {
  const chain: GraphEdgeInstance[] = [];
  if (body.length) {
    chain.push({
      id: graphLoopChainEdgeId('loop-1', 'item', body[0], 'value'),
      type: 'data',
      source: { scope: 'node', nodeId: 'loop-1', port: 'item' },
      target: { scope: 'node', nodeId: body[0], port: 'value' },
      label: 'item',
      metadata: { mandatory: true },
    });
    for (let index = 1; index < body.length; index += 1) {
      chain.push({
        id: graphLoopChainEdgeId(body[index - 1], 'value', body[index], 'value'),
        type: 'data',
        source: { scope: 'node', nodeId: body[index - 1], port: 'value' },
        target: { scope: 'node', nodeId: body[index], port: 'value' },
        label: 'value',
        metadata: { mandatory: true },
      });
    }
    const last = body[body.length - 1];
    chain.push({
      id: graphLoopChainEdgeId(last, 'value', 'loop-1', 'loop'),
      type: 'data',
      source: { scope: 'node', nodeId: last, port: 'value' },
      target: { scope: 'node', nodeId: 'loop-1', port: 'loop' },
      label: 'loop',
      metadata: { mandatory: true },
    });
  }
  return {
    id: 'wf-loop',
    name: 'Loop workflow',
    inputs: [],
    outputs: [],
    nodes: [
      { id: 'loop-1', kind: 'core.loop.foreach', label: 'For each', parameters: {} },
      ...body.map((id) => ({ id, kind: 'core.flow.log', label: id, parameters: {} })),
    ],
    edges: chain,
  } as GraphWorkflowDocument;
}

describe('graphWorkflowDocumentCanvasModelOf — loop ghosts (SAA-1363 reqs 10-12)', () => {
  it('projects a canvas-only ghost with graph-edge containment edges for an empty loop', () => {
    const projection = graphWorkflowDocumentCanvasModelOf(loopDocument([]), adapterReaderOf());

    const ghost = projection.nodes.find((node) => node.id === 'ghost-loop-1');
    expect(ghost).toBeDefined();
    expect(ghost!.type).toBe('graph.ghost');
    expect(ghost!.data).toMatchObject({
      isGhost: true,
      ghostParentId: 'loop-1',
      kind: 'graph.ghost',
    });

    const ghostEdges = projection.edges.filter((edge) => edge.id.startsWith('edge-ghost'));
    expect(ghostEdges.map((edge) => edge.id).sort()).toEqual([
      'edge-ghost-in-loop-1',
      'edge-ghost-out-loop-1',
    ]);
    expect(ghostEdges.map((edge) => edge.type)).toEqual(['graph-edge', 'graph-edge']);
    expect(ghostEdges.every((edge) => edgeDataOf(edge).mandatory === true)).toBe(true);
    // The ghost is a canvas affordance: the projection owns its ids, but the
    // document is never mutated to carry the ghost.
    expect(projection.nodeIds).toContain('ghost-loop-1');
    const document = loopDocument([]);
    graphWorkflowDocumentCanvasModelOf(document, adapterReaderOf());
    expect(document.nodes.some((node) => node.id === 'ghost-loop-1')).toBe(false);
    expect(document.edges.some((edge) => edge.id.startsWith('edge-ghost'))).toBe(false);
  });

  it('projects no ghost once the loop holds a real body node', () => {
    const projection = graphWorkflowDocumentCanvasModelOf(loopDocument(['a']), adapterReaderOf());

    expect(projection.nodes.some((node) => node.id === 'ghost-loop-1')).toBe(false);
    expect(projection.edges.some((edge) => edge.id.includes('ghost-loop-1'))).toBe(false);
    expect(projection.nodeIds).toContain('a');
  });

  it('opts out of loop ghosts when includeLoopGhosts is false (run projection)', () => {
    const projection = graphWorkflowDocumentCanvasModelOf(loopDocument([]), adapterReaderOf(), {
      includeLoopGhosts: false,
    });

    expect(projection.nodes.some((node) => node.id === 'ghost-loop-1')).toBe(false);
    expect(projection.edges.some((edge) => edge.id.includes('ghost-loop-1'))).toBe(false);
    // The loop itself and its ordinary projection remain.
    expect(projection.nodeIds).toContain('loop-1');
  });

  it('drops a legacy document-carried ghost node and every edge touching it', () => {
    const document = loopDocument([]);
    document.nodes.push({
      id: 'ghost-loop-1',
      kind: 'graph.ghost',
      label: 'Add node',
      parameters: { ghostParentId: 'loop-1' },
    } as GraphNodeInstance);
    document.edges.push(
      {
        id: 'legacy-in',
        type: 'data',
        source: { scope: 'node', nodeId: 'loop-1', port: 'item' },
        target: { scope: 'node', nodeId: 'ghost-loop-1', port: 'in' },
        label: 'item',
        metadata: { mandatory: true },
      },
      {
        id: 'legacy-out',
        type: 'data',
        source: { scope: 'node', nodeId: 'ghost-loop-1', port: 'out' },
        target: { scope: 'node', nodeId: 'loop-1', port: 'loop' },
        label: 'loop',
        metadata: { mandatory: true },
      }
    );

    const projection = graphWorkflowDocumentCanvasModelOf(document, adapterReaderOf());

    // No duplicate ghost: the legacy document ghost is dropped, and the empty
    // loop is re-synthesised as the single canvas-only affordance.
    expect(projection.nodes.filter((node) => node.type === 'graph.ghost')).toHaveLength(1);
    expect(projection.edges.some((edge) => edge.id === 'legacy-in' || edge.id === 'legacy-out')).toBe(false);
    expect(projection.edgeIds).not.toContain('legacy-in');
    expect(projection.edgeIds).not.toContain('legacy-out');
  });

  it('gives loop-chain edges the same graph-edge template and label as normal edges', () => {
    const document = loopDocument(['a', 'b']);
    document.nodes.push({ id: 'c', kind: 'core.flow.log', label: 'c', parameters: {} });
    document.edges.push({
      id: 'normal-edge',
      type: 'data',
      source: { scope: 'node', nodeId: 'loop-1', port: 'done' },
      target: { scope: 'node', nodeId: 'c', port: 'value' },
      label: 'value',
    });

    const projection = graphWorkflowDocumentCanvasModelOf(document, adapterReaderOf());
    const chainEdges = projection.edges.filter(
      (edge) => edgeDataOf(edge).mandatory === true && !edge.id.includes('ghost')
    );
    const normal = projection.edges.find((edge) => edge.id === 'normal-edge');

    expect(chainEdges).toHaveLength(3);
    expect(normal).toBeDefined();
    expect(normal!.type).toBe('graph-edge');
    for (const edge of chainEdges) {
      expect(edge.type).toBe(normal!.type);
      expect(edgeDataOf(edge).label).toBeDefined();
      expect(typeof edgeDataOf(edge).engineEdgeId).toBe('string');
      expect(edgeDataOf(edge).engineEdgeId).not.toBe('');
    }
    // Labels mirror the document labels exactly; the template renders them
    // through the same `data.label` element as a normal edge.
    expect(edgeDataOf(projection.edges.find((edge) => edge.id === chainEdges[0].id)!).label).toBe('item');
    expect(edgeDataOf(projection.edges.find((edge) => edge.id === chainEdges[chainEdges.length - 1].id)!).label).toBe('loop');
  });
});
