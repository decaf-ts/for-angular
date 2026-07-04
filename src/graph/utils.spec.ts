import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  buildGraphRendererModel,
  buildGraphRendererSnapshot,
  buildGraphRendererStateFromSnapshot,
  buildGraphRendererViewModel,
  getGraphWorkflowSummary,
} from './utils';
import { GraphPublishingWorkflow } from '../app/pages/graph/workflow-root';

describe('graph adapter', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('derives the workflow-root summary from the decorated graph class', () => {
    const summary = getGraphWorkflowSummary(GraphPublishingWorkflow as never);

    expect(summary).toMatchObject({
      totalNodes: 10,
      totalEdges: 6,
      totalInputs: 1,
      totalOutputs: 1,
    });
    expect(summary.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'workflow', count: 3 }),
        expect.objectContaining({ kind: 'pipeline', count: 1 }),
        expect.objectContaining({ kind: 'node', count: 2 }),
        expect.objectContaining({ kind: 'core.loop.foreach', count: 1 }),
        expect.objectContaining({ kind: 'core.loop.while', count: 1 }),
        expect.objectContaining({ kind: 'core.loop.until', count: 1 }),
        expect.objectContaining({ kind: 'value', count: 1 }),
      ])
    );
    expect(summary.edgeLabels.map((item) => item.label)).toEqual([
      'request',
      'brief',
      'plan',
      'draft',
      'approved',
      'artifact',
    ]);
  });

  it('builds reusable value nodes and full workflow graph connections from the graph root', () => {
    const viewModel = buildGraphRendererViewModel(GraphPublishingWorkflow as never);

    expect(viewModel.inputs).toHaveLength(1);
    expect(viewModel.nodes).toHaveLength(8);
    expect(viewModel.workflowOutputs).toHaveLength(1);
    expect(viewModel.inputs[0]).toMatchObject({
      id: 'input-request',
      type: 'value',
      data: expect.objectContaining({
        role: 'input',
        property: 'request',
        isPrimary: true,
      }),
    });
    expect(viewModel.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'input-request',
          target: 'GraphIntakeWorkflow',
          sourcePort: 'value',
          targetPort: 'request',
        }),
      ])
    );
  });

  it('builds an ng-diagram model for the workflow root', () => {
    const model = buildGraphRendererModel(GraphPublishingWorkflow as never, TestBed.inject(Injector));

    expect(model.getNodes()).toHaveLength(9);
    expect(model.getEdges()).toHaveLength(5);
    expect(model.getNodes()[0]).toMatchObject({
      id: 'input-request',
      type: 'value',
    });
    expect(model.getNodes()[5]).toMatchObject({
      id: 'GraphPublishWorkflow',
      type: 'workflow',
    });
  });

  it('serializes and restores the workflow renderer state', () => {
    const injector = TestBed.inject(Injector);
    const model = buildGraphRendererModel(
      GraphPublishingWorkflow as never,
      injector,
      {
        request: 'Draft a publishing workflow for the next product release.',
      },
      {
        request: 1,
      }
    );

    model.updateNodes((nodes) =>
      nodes.map((node) =>
        node.id === 'input-request'
          ? {
              ...node,
              position: {
                x: 48,
                y: 96,
              },
              data: {
                ...node.data,
                expanded: true,
              },
            }
          : node
      )
    );
    model.updateMetadata((metadata) => ({
      ...metadata,
      viewport: {
        x: 12,
        y: 18,
        scale: 1.25,
      },
    }));

    const snapshot = buildGraphRendererSnapshot(
      GraphPublishingWorkflow as never,
      model,
      {
        request: 'Draft a publishing workflow for the next product release.',
      },
      {
        request: 1,
      }
    );
    const restored = buildGraphRendererStateFromSnapshot(GraphPublishingWorkflow as never, snapshot, injector);

    expect(snapshot.state.ui).toMatchObject({
      duplicateCounts: {
        request: 1,
      },
    });
    expect(snapshot.state.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'input-request',
          position: {
            x: 48,
            y: 96,
          },
          data: expect.objectContaining({
            expanded: true,
          }),
        }),
      ])
    );
    expect(restored.duplicateCounts).toEqual({
      request: 1,
    });
    expect(restored.inputValues).toEqual({
      request: 'Draft a publishing workflow for the next product release.',
    });
    expect(restored.diagram.getNodes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'input-request',
          position: {
            x: 48,
            y: 96,
          },
          data: expect.objectContaining({
            expanded: true,
          }),
        }),
      ])
    );
    expect(restored.diagram.getMetadata()).toMatchObject({
      viewport: {
        x: 12,
        y: 18,
        scale: 1.25,
      },
    });
  });
});
