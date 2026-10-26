/**
 * @module for-angular/graph/document/LoopChainRepair.spec
 * @summary Canonical foreach loop-chain contract (SAA-1363 reqs 10-12).
 * @description Pins the deletion-safe canvas chain that replaces the legacy
 * document-carried loop ghost:
 *
 * - the ordered body walk follows `loop:item -> first -> ... -> last -> loop:loop`
 *   over mandatory chain edges only, stopping at the loop's `loop` input;
 * - an empty loop has no body and therefore no chain;
 * - insertion/appending splices into the same single chain (never a parallel
 *   body), and deleting a mid body node keeps the surviving order;
 * - command generation is idempotent: applying the commands and asking again
 *   produces nothing, so a no-op repair never churns the document.
 */
import type {
  GraphEdgeInstance,
  GraphNodeInstance,
  GraphWorkflowDocument,
} from '@decaf-ts/as-graph/shared';
import { applyGraphDocumentCommand } from './GraphDocumentCommands';
import {
  GRAPH_FOREACH_LOOP_KIND,
  GRAPH_LOOP_CONNECTION_PORT,
  GRAPH_LOOP_ITEM_PORT,
  graphForeachLoopIdsOf,
  graphLoopBodyOrderOf,
  graphLoopBodyOrdersOf,
  graphLoopChainCommandsFor,
  graphLoopChainEdgeId,
} from './LoopChainRepair';

const LOOP_ID = 'loop-1';

function nodeOf(id: string): GraphNodeInstance {
  return { id, kind: 'core.flow.log', label: id, parameters: {} };
}

interface ChainEdgeSpec {
  id?: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
  mandatory?: boolean;
}

function edgeOf(spec: ChainEdgeSpec): GraphEdgeInstance {
  const edge: GraphEdgeInstance = {
    id: spec.id ?? graphLoopChainEdgeId(spec.source, spec.sourcePort, spec.target, spec.targetPort),
    type: 'data',
    source: { scope: 'node', nodeId: spec.source, port: spec.sourcePort },
    target: { scope: 'node', nodeId: spec.target, port: spec.targetPort },
    label: spec.targetPort,
  };
  if (spec.mandatory !== false) edge.metadata = { mandatory: true };
  return edge;
}

function loopNode(): GraphNodeInstance {
  return { id: LOOP_ID, kind: GRAPH_FOREACH_LOOP_KIND, label: 'For each', parameters: {} };
}

/**
 * A loop with the canonical three-node body `a -> b -> c`:
 * `loop:item -> a:value`, `a:value -> b:value`, `b:value -> c:value`,
 * `c:value -> loop:loop`.
 */
function documentOf(
  body: string[] = ['a', 'b', 'c'],
  edges?: ChainEdgeSpec[],
  extraNodes: string[] = []
): GraphWorkflowDocument {
  const chain: ChainEdgeSpec[] =
    edges ??
    (body.length
      ? [
          { source: LOOP_ID, sourcePort: GRAPH_LOOP_ITEM_PORT, target: body[0], targetPort: 'value' },
          ...body.slice(0, -1).map((id, index) => ({
            source: id,
            sourcePort: 'value',
            target: body[index + 1],
            targetPort: 'value',
          })),
          {
            source: body[body.length - 1],
            sourcePort: 'value',
            target: LOOP_ID,
            targetPort: GRAPH_LOOP_CONNECTION_PORT,
          },
        ]
      : []);
  return {
    id: 'wf-loop-chain',
    name: 'Loop chain',
    inputs: [],
    outputs: [],
    nodes: [loopNode(), ...body.map(nodeOf), ...extraNodes.map(nodeOf)],
    edges: chain.map(edgeOf),
  };
}

function applyAll(
  document: GraphWorkflowDocument,
  commands: ReturnType<typeof graphLoopChainCommandsFor>
): GraphWorkflowDocument {
  return commands.reduce<GraphWorkflowDocument>(
    (current, command) => applyGraphDocumentCommand(current, command) as GraphWorkflowDocument,
    document
  );
}

function chainPairs(document: GraphWorkflowDocument): string[] {
  return document.edges
    .filter((edge) => edge.metadata?.['mandatory'] === true)
    .map((edge) => edge.id)
    .sort();
}

describe('LoopChainRepair — canonical foreach body walk', () => {
  it('lists every foreach loop id and reports an empty body per loop', () => {
    const document = documentOf([]);

    expect(graphForeachLoopIdsOf(document)).toEqual([LOOP_ID]);
    expect(graphLoopBodyOrderOf(document, LOOP_ID)).toEqual([]);
    expect(graphLoopBodyOrdersOf(document).get(LOOP_ID)).toEqual([]);
  });

  it('walks the chain from item to the loop connection input in order', () => {
    expect(graphLoopBodyOrderOf(documentOf(), LOOP_ID)).toEqual([
      { nodeId: 'a', inputPort: 'value', outputPort: 'value' },
      { nodeId: 'b', inputPort: 'value', outputPort: 'value' },
      { nodeId: 'c', inputPort: 'value', outputPort: 'value' },
    ]);
  });

  it('honours non-default ports on the first and last body step', () => {
    const document = documentOf(['a'], [
      { source: LOOP_ID, sourcePort: GRAPH_LOOP_ITEM_PORT, target: 'a', targetPort: 'text' },
      { source: 'a', sourcePort: 'result', target: LOOP_ID, targetPort: GRAPH_LOOP_CONNECTION_PORT },
    ]);

    expect(graphLoopBodyOrderOf(document, LOOP_ID)).toEqual([
      { nodeId: 'a', inputPort: 'text', outputPort: 'result' },
    ]);
  });

  it('follows mandatory chain edges only and ignores a decoy relation', () => {
    const document = documentOf(['a', 'b'], [
      { source: LOOP_ID, sourcePort: GRAPH_LOOP_ITEM_PORT, target: 'a', targetPort: 'value' },
      { source: 'a', sourcePort: 'value', target: 'b', targetPort: 'value' },
      { source: 'b', sourcePort: 'value', target: LOOP_ID, targetPort: GRAPH_LOOP_CONNECTION_PORT },
      { source: 'a', sourcePort: 'other', target: 'b', targetPort: 'value', mandatory: false },
    ]);

    expect(graphLoopBodyOrderOf(document, LOOP_ID).map((step) => step.nodeId)).toEqual(['a', 'b']);
  });

  it('never follows a chain edge into a ghost node', () => {
    const document = documentOf(['a'], [
      { source: LOOP_ID, sourcePort: GRAPH_LOOP_ITEM_PORT, target: 'ghost-loop-1', targetPort: 'in' },
      { source: 'ghost-loop-1', sourcePort: 'out', target: LOOP_ID, targetPort: GRAPH_LOOP_CONNECTION_PORT },
    ]);
    document.nodes.push({ id: 'ghost-loop-1', kind: 'graph.ghost', label: 'Add node', parameters: {} });

    expect(graphLoopBodyOrderOf(document, LOOP_ID)).toEqual([]);
  });

  it('stops at the loop connection port and ignores an edge that leaves the body', () => {
    const document = documentOf(['a', 'b'], [
      { source: LOOP_ID, sourcePort: GRAPH_LOOP_ITEM_PORT, target: 'a', targetPort: 'value' },
      { source: 'a', sourcePort: 'value', target: 'b', targetPort: 'value' },
      { source: 'b', sourcePort: 'value', target: LOOP_ID, targetPort: GRAPH_LOOP_CONNECTION_PORT },
      { source: 'b', sourcePort: 'value', target: 'outside', targetPort: 'value' },
    ]);
    document.nodes.push(nodeOf('outside'));

    expect(graphLoopBodyOrderOf(document, LOOP_ID).map((step) => step.nodeId)).toEqual(['a', 'b']);
  });

  it('is cycle-safe when a stale chain edge loops back to an earlier body node', () => {
    const document = documentOf(['a', 'b'], [
      { source: LOOP_ID, sourcePort: GRAPH_LOOP_ITEM_PORT, target: 'a', targetPort: 'value' },
      { source: 'a', sourcePort: 'value', target: 'b', targetPort: 'value' },
      { source: 'b', sourcePort: 'value', target: 'a', targetPort: 'value' },
    ]);

    expect(graphLoopBodyOrderOf(document, LOOP_ID).map((step) => step.nodeId)).toEqual(['a', 'b']);
  });
});

describe('LoopChainRepair — command generation', () => {
  it('emits nothing for a document already holding the canonical chain', () => {
    expect(graphLoopChainCommandsFor(documentOf(), graphLoopBodyOrdersOf(documentOf()))).toEqual([]);
  });

  it('emits nothing for an empty loop without a stale chain', () => {
    expect(graphLoopChainCommandsFor(documentOf([]), graphLoopBodyOrdersOf(documentOf([])))).toEqual([]);
  });

  it('builds the canonical chain for an empty loop receiving its first body node', () => {
    const document = documentOf([], undefined, ['a']);
    const commands = graphLoopChainCommandsFor(document, new Map([[LOOP_ID, [
      { nodeId: 'a', inputPort: 'value', outputPort: 'value' },
    ]]]));

    expect(commands).toEqual([
      {
        type: 'edge.add',
        edge: expect.objectContaining({
          source: { scope: 'node', nodeId: LOOP_ID, port: GRAPH_LOOP_ITEM_PORT },
          target: { scope: 'node', nodeId: 'a', port: 'value' },
          metadata: { mandatory: true },
        }),
      },
      {
        type: 'edge.add',
        edge: expect.objectContaining({
          source: { scope: 'node', nodeId: 'a', port: 'value' },
          target: { scope: 'node', nodeId: LOOP_ID, port: GRAPH_LOOP_CONNECTION_PORT },
          metadata: { mandatory: true },
        }),
      },
    ]);

    const repaired = applyAll(document, commands);
    expect(graphLoopBodyOrderOf(repaired, LOOP_ID).map((step) => step.nodeId)).toEqual(['a']);
  });

  it('appends a node to the end of the existing chain without a parallel edge', () => {
    const document = documentOf(['a', 'b'], undefined, ['c']);
    const commands = graphLoopChainCommandsFor(
      document,
      new Map([[LOOP_ID, [
        { nodeId: 'a', inputPort: 'value', outputPort: 'value' },
        { nodeId: 'b', inputPort: 'value', outputPort: 'value' },
        { nodeId: 'c', inputPort: 'value', outputPort: 'value' },
      ]]])
    );

    expect(commands).toEqual([
      { type: 'edge.remove', edgeId: graphLoopChainEdgeId('b', 'value', LOOP_ID, GRAPH_LOOP_CONNECTION_PORT) },
      {
        type: 'edge.add',
        edge: expect.objectContaining({
          source: { scope: 'node', nodeId: 'b', port: 'value' },
          target: { scope: 'node', nodeId: 'c', port: 'value' },
        }),
      },
      {
        type: 'edge.add',
        edge: expect.objectContaining({
          source: { scope: 'node', nodeId: 'c', port: 'value' },
          target: { scope: 'node', nodeId: LOOP_ID, port: GRAPH_LOOP_CONNECTION_PORT },
        }),
      },
    ]);

    const repaired = applyAll(document, commands);
    expect(graphLoopBodyOrderOf(repaired, LOOP_ID).map((step) => step.nodeId)).toEqual(['a', 'b', 'c']);
  });

  it('inserts a node between two body nodes in the same chain', () => {
    const document = documentOf(['a', 'b'], undefined, ['inserted']);
    const commands = graphLoopChainCommandsFor(
      document,
      new Map([[LOOP_ID, [
        { nodeId: 'a', inputPort: 'value', outputPort: 'value' },
        { nodeId: 'inserted', inputPort: 'value', outputPort: 'value' },
        { nodeId: 'b', inputPort: 'value', outputPort: 'value' },
      ]]])
    );

    expect(commands).toEqual([
      { type: 'edge.remove', edgeId: graphLoopChainEdgeId('a', 'value', 'b', 'value') },
      {
        type: 'edge.add',
        edge: expect.objectContaining({
          source: { scope: 'node', nodeId: 'a', port: 'value' },
          target: { scope: 'node', nodeId: 'inserted', port: 'value' },
        }),
      },
      {
        type: 'edge.add',
        edge: expect.objectContaining({
          source: { scope: 'node', nodeId: 'inserted', port: 'value' },
          target: { scope: 'node', nodeId: 'b', port: 'value' },
        }),
      },
    ]);

    const repaired = applyAll(document, commands);
    expect(graphLoopBodyOrderOf(repaired, LOOP_ID).map((step) => step.nodeId)).toEqual([
      'a',
      'inserted',
      'b',
    ]);
  });

  it('deleting a mid body node keeps the surviving order and reconnects neighbours', () => {
    // The canvas already removed `b` and every edge touching it; the repair
    // receives the pre-delete body order filtered to the survivors.
    const document = documentOf(['a', 'c'], [
      { source: LOOP_ID, sourcePort: GRAPH_LOOP_ITEM_PORT, target: 'a', targetPort: 'value' },
    ]);

    const commands = graphLoopChainCommandsFor(
      document,
      new Map([[LOOP_ID, [
        { nodeId: 'a', inputPort: 'value', outputPort: 'value' },
        { nodeId: 'c', inputPort: 'value', outputPort: 'value' },
      ]]])
    );

    expect(commands).toEqual([
      {
        type: 'edge.add',
        edge: expect.objectContaining({
          source: { scope: 'node', nodeId: 'a', port: 'value' },
          target: { scope: 'node', nodeId: 'c', port: 'value' },
        }),
      },
      {
        type: 'edge.add',
        edge: expect.objectContaining({
          source: { scope: 'node', nodeId: 'c', port: 'value' },
          target: { scope: 'node', nodeId: LOOP_ID, port: GRAPH_LOOP_CONNECTION_PORT },
        }),
      },
    ]);

    const repaired = applyAll(document, commands);
    expect(graphLoopBodyOrderOf(repaired, LOOP_ID).map((step) => step.nodeId)).toEqual(['a', 'c']);
    expect(chainPairs(repaired)).toEqual(
      [
        graphLoopChainEdgeId(LOOP_ID, GRAPH_LOOP_ITEM_PORT, 'a', 'value'),
        graphLoopChainEdgeId('a', 'value', 'c', 'value'),
        graphLoopChainEdgeId('c', 'value', LOOP_ID, GRAPH_LOOP_CONNECTION_PORT),
      ].sort()
    );
  });

  it('reconnects the loop when the only body node is deleted (empty loop)', () => {
    const document = documentOf([], [
      { source: LOOP_ID, sourcePort: GRAPH_LOOP_ITEM_PORT, target: 'a', targetPort: 'value' },
      { source: 'a', sourcePort: 'value', target: LOOP_ID, targetPort: GRAPH_LOOP_CONNECTION_PORT },
    ]);

    const commands = graphLoopChainCommandsFor(document, new Map([[LOOP_ID, []]]));

    expect(commands.sort((left, right) => left.type.localeCompare(right.type))).toEqual([
      { type: 'edge.remove', edgeId: graphLoopChainEdgeId(LOOP_ID, GRAPH_LOOP_ITEM_PORT, 'a', 'value') },
      {
        type: 'edge.remove',
        edgeId: graphLoopChainEdgeId('a', 'value', LOOP_ID, GRAPH_LOOP_CONNECTION_PORT),
      },
    ]);
    expect(chainPairs(applyAll(document, commands))).toEqual([]);
  });

  it('is idempotent: applying the commands then regenerating dispatches nothing', () => {
    const document = documentOf(['a'], undefined, ['b']);
    const orders = new Map([[LOOP_ID, [
      { nodeId: 'a', inputPort: 'value', outputPort: 'value' },
      { nodeId: 'b', inputPort: 'value', outputPort: 'value' },
    ]]]);

    const repaired = applyAll(document, graphLoopChainCommandsFor(document, orders));

    expect(graphLoopChainCommandsFor(repaired, orders)).toEqual([]);
  });

  it('leaves a chain-free document untouched and never invents a loop edge', () => {
    const document: GraphWorkflowDocument = {
      id: 'wf-plain',
      name: 'Plain',
      inputs: [],
      outputs: [],
      nodes: [loopNode(), nodeOf('a')],
      edges: [],
    };

    expect(graphLoopChainCommandsFor(document, graphLoopBodyOrdersOf(document))).toEqual([]);
  });
});
