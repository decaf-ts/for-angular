import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { graphDefinitionOf, PortDirection } from '@decaf-ts/ui-decorators/graph';
import { countPortsByDirection } from '../../../graph/utils';
import { buildGraphDemoModel, getGraphDemoOrderedDefinitions, getGraphDemoSummary } from './utils';
import { GraphDraftNode, GraphIntakeWorkflow, GraphPlanningPipeline, GRAPH_DEMO_NODES } from './example-nodes';

describe('graph demo utils', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('derives graph metadata from decorated classes', () => {
    const intake = graphDefinitionOf(GraphIntakeWorkflow as never);
    const planning = graphDefinitionOf(GraphPlanningPipeline as never);
    const draft = graphDefinitionOf(GraphDraftNode as never);

    expect(intake.kind).toBe('workflow');
    expect(planning.kind).toBe('pipeline');
    expect(draft.kind).toBe('node');
    expect(GRAPH_DEMO_NODES).toHaveLength(5);
    expect(intake.ports).toHaveLength(2);
    expect(countPortsByDirection(PortDirection.INPUT, intake.ports)).toBe(1);
    expect(countPortsByDirection(PortDirection.OUTPUT, intake.ports)).toBe(1);
  });

  it('builds a diagram model from the decorated node chain', () => {
    const model = buildGraphDemoModel(TestBed.inject(Injector));
    const nodes = model.getNodes();
    const edges = model.getEdges();

    expect(nodes).toHaveLength(5);
    expect(edges).toHaveLength(4);
    expect(nodes[0].type).toBe('workflow');
    expect(nodes[0].data).toMatchObject({
      title: 'Ingestion workflow',
      kind: 'workflow',
      sourceClass: 'GraphIntakeWorkflow',
    });
    expect(edges[0]).toMatchObject({
      source: 'GraphIntakeWorkflow',
      target: 'GraphPlanningPipeline',
      sourcePort: 'brief',
      targetPort: 'brief',
    });
  });

  it('derives the dashboard summary from the decorated classes', () => {
    const summary = getGraphDemoSummary();

    expect(summary).toMatchObject({
      totalNodes: 5,
      totalEdges: 4,
      totalInputs: 5,
      totalOutputs: 5,
    });
    expect(summary.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'workflow', count: 2 }),
        expect.objectContaining({ kind: 'pipeline', count: 1 }),
        expect.objectContaining({ kind: 'node', count: 2 }),
      ])
    );
    expect(summary.orderedNodes.map((item) => item.name)).toEqual([
      'GraphIntakeWorkflow',
      'GraphPlanningPipeline',
      'GraphDraftNode',
      'GraphReviewNode',
      'GraphPublishWorkflow',
    ]);
    expect(summary.edgeLabels.map((item) => item.label)).toEqual(['brief', 'plan', 'draft', 'approved']);
  });

  it('derives the graph traversal order from the edge chain', () => {
    const ordered = getGraphDemoOrderedDefinitions();

    expect(ordered.map(({ definition }) => definition.name)).toEqual([
      'GraphIntakeWorkflow',
      'GraphPlanningPipeline',
      'GraphDraftNode',
      'GraphReviewNode',
      'GraphPublishWorkflow',
    ]);
  });
});
