import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { graphDefinitionOf, PortDirection } from '@decaf-ts/ui-decorators/graph';
import { countPortsByDirection } from '../../../graph/utils';
import { buildGraphDemoModel, getGraphDemoOrderedDefinitions, getGraphDemoSummary } from './utils';
import { GraphForeachLoopNode, GRAPH_DEMO_NODES } from './example-nodes';

describe('graph demo utils', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('derives graph metadata from decorated classes', () => {
    const foreach = graphDefinitionOf(GraphForeachLoopNode as never);

    expect(foreach.kind).toBe('core.loop.foreach');
    expect(GRAPH_DEMO_NODES).toHaveLength(3);
    expect(foreach.ports).toHaveLength(2);
    expect(countPortsByDirection(PortDirection.INPUT, foreach.ports)).toBe(1);
    expect(countPortsByDirection(PortDirection.OUTPUT, foreach.ports)).toBe(1);
  });

  it('builds a diagram model from the decorated node chain', () => {
    const model = buildGraphDemoModel(TestBed.inject(Injector));
    const nodes = model.getNodes();
    const edges = model.getEdges();

    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(0);
    expect(nodes[0].type).toBe('core.loop.foreach');
    expect(nodes[0].data).toMatchObject({
      kind: 'core.loop.foreach',
      sourceClass: 'GraphForeachLoopNode',
    });
  });

  it('derives the dashboard summary from the decorated classes', () => {
    const summary = getGraphDemoSummary();

    expect(summary).toMatchObject({
      totalNodes: 3,
      totalEdges: 0,
      totalInputs: 3,
      totalOutputs: 3,
    });
    expect(summary.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'core.loop.foreach', count: 1 }),
        expect.objectContaining({ kind: 'core.loop.while', count: 1 }),
        expect.objectContaining({ kind: 'core.loop.until', count: 1 }),
      ])
    );
    expect(summary.orderedNodes.map((item) => item.name)).toEqual([
      'GraphForeachLoopNode',
      'GraphWhileLoopNode',
      'GraphUntilLoopNode',
    ]);
    expect(summary.edgeLabels).toHaveLength(0);
  });

  it('derives the graph traversal order from the edge chain', () => {
    const ordered = getGraphDemoOrderedDefinitions();

    expect(ordered.map(({ definition }) => definition.name)).toEqual([
      'GraphForeachLoopNode',
      'GraphWhileLoopNode',
      'GraphUntilLoopNode',
    ]);
  });
});
