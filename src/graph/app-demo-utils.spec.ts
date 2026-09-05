import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GRAPH_LOOP_NODES } from '@decaf-ts/ui-decorators/graph';
import {
  buildGraphDemoModel,
  getGraphDemoDefinitions,
  getGraphDemoOrderedDefinitions,
  getGraphDemoSummary,
  GRAPH_DEMO_NODES,
} from '../app/pages/graph/utils';

/**
 * Live coverage for the app demo-utils (`src/app/pages/graph/utils.ts`).
 *
 * The previous `src/app/pages/graph/utils.spec.ts` was dead: jest's
 * `modulePathIgnorePatterns: ['/dist','src/app']` excludes any `spec` living
 * under `src/app`, and the spec still imported the deleted
 * `./example-nodes`. Those helpers now derive their nodes from the shared
 * `GRAPH_LOOP_NODES` system kinds, so this spec is placed in `src/graph`
 * (jest-discoverable) and imports the app helpers directly, following the
 * same pattern as `src/graph/utils.spec.ts`.
 */
describe('graph app demo utils', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('exposes the shared loop node kinds as the demo node source', () => {
    expect(GRAPH_DEMO_NODES).toBe(GRAPH_LOOP_NODES);
    expect(GRAPH_DEMO_NODES).toHaveLength(3);

    const kinds = getGraphDemoDefinitions().map((item) => item.definition.kind);
    expect(kinds).toEqual(['core.loop.foreach', 'core.loop.while', 'core.loop.until']);
  });

  it('builds a diagram model from the shared loop node kinds', () => {
    const model = buildGraphDemoModel(TestBed.inject(Injector));
    const nodes = model.getNodes();
    const edges = model.getEdges();

    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(0);
    expect(nodes[0]).toMatchObject({
      id: 'GraphForeachLoopNode',
      type: 'core.loop.foreach',
    });
    expect(nodes[0].data).toMatchObject({
      title: 'Foreach loop',
      kind: 'core.loop.foreach',
      sourceClass: 'GraphForeachLoopNode',
    });
    expect(nodes[1]).toMatchObject({
      id: 'GraphWhileLoopNode',
      type: 'core.loop.while',
    });
    expect(nodes[2]).toMatchObject({
      id: 'GraphUntilLoopNode',
      type: 'core.loop.until',
    });
  });

  it('derives the demo summary from the shared loop node kinds', () => {
    const summary = getGraphDemoSummary();

    expect(summary).toMatchObject({
      totalNodes: 3,
      totalEdges: 0,
    });
    expect(summary.items).toEqual([
      expect.objectContaining({ kind: 'core.loop.foreach', count: 1, label: 'Foreach loop' }),
      expect.objectContaining({ kind: 'core.loop.while', count: 1, label: 'While loop' }),
      expect.objectContaining({ kind: 'core.loop.until', count: 1, label: 'Until loop' }),
    ]);
    expect(summary.orderedNodes.map((item) => item.name)).toEqual([
      'GraphForeachLoopNode',
      'GraphWhileLoopNode',
      'GraphUntilLoopNode',
    ]);
    expect(summary.edgeLabels).toEqual([]);
  });

  it('derives the demo traversal order from the shared loop node kinds', () => {
    const ordered = getGraphDemoOrderedDefinitions();

    expect(ordered.map(({ definition }) => definition.name)).toEqual([
      'GraphForeachLoopNode',
      'GraphWhileLoopNode',
      'GraphUntilLoopNode',
    ]);
  });
});
