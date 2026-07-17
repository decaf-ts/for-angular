import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  buildGraphRendererModel,
  buildGraphRendererSnapshot,
  buildGraphRendererStateFromSnapshot,
  buildGraphRendererViewModel,
  getGraphWorkflowSummary,
} from './utils';
import { TextPipelineWorkflow } from '../app/pages/graph/workflow-root';

describe('graph adapter', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('derives the workflow-root summary from the decorated graph class', () => {
    const summary = getGraphWorkflowSummary(TextPipelineWorkflow as never);

    expect(summary).toMatchObject({
      totalNodes: 6,
      totalEdges: 5,
      totalInputs: 2,
      totalOutputs: 1,
    });
    expect(summary.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'workflow', count: 1 }),
        expect.objectContaining({ kind: 'core.flow.code', count: 1 }),
        expect.objectContaining({ kind: 'core.loop.foreach', count: 1 }),
        expect.objectContaining({ kind: 'core.flow.log', count: 1 }),
        expect.objectContaining({ kind: 'value', count: 1 }),
      ])
    );
    expect(summary.edgeLabels.map((item) => item.label)).toEqual(
      expect.arrayContaining([
        'count',
        'text',
        'lines',
        'results',
        'final-result',
      ])
    );
  });

  it('builds reusable value nodes and full workflow graph connections from the graph root', () => {
    const viewModel = buildGraphRendererViewModel(TextPipelineWorkflow as never);

    expect(viewModel.inputs).toHaveLength(2);
    expect(viewModel.nodes).toHaveLength(3);
    expect(viewModel.workflowOutputs).toHaveLength(1);
    expect(viewModel.inputs[0]).toMatchObject({
      id: 'input-count',
      type: 'value',
      data: expect.objectContaining({
        role: 'input',
        property: 'count',
        isPrimary: true,
      }),
    });
    expect(viewModel.inputs[1]).toMatchObject({
      id: 'input-text',
      type: 'value',
      data: expect.objectContaining({
        role: 'input',
        property: 'text',
        isPrimary: true,
      }),
    });
    expect(viewModel.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'input-count',
          target: 'SplitTextCodeNode',
          sourcePort: 'value',
          targetPort: 'data',
        }),
        expect.objectContaining({
          source: 'input-text',
          target: 'SplitTextCodeNode',
          sourcePort: 'value',
          targetPort: 'data',
        }),
      ])
    );
  });

  it('builds an ng-diagram model for the workflow root', () => {
    const model = buildGraphRendererModel(TextPipelineWorkflow as never, TestBed.inject(Injector));

    expect(model.getNodes()).toHaveLength(5);
    expect(model.getEdges()).toHaveLength(4);
    expect(model.getNodes()[0]).toMatchObject({
      id: 'input-count',
      type: 'value',
    });
    expect(model.getNodes()[2]).toMatchObject({
      id: 'SplitTextCodeNode',
      type: 'core.flow.code',
    });
  });

  it('serializes and restores the workflow renderer state', () => {
    const injector = TestBed.inject(Injector);
    const inputValues = {
      count: 1,
      text: 'Hello\nWorld\nFoo\nBar\nBaz',
    };
    const duplicateInputs = {
      count: 1,
      text: 1,
    };
    const model = buildGraphRendererModel(
      TextPipelineWorkflow as never,
      injector,
      inputValues,
      duplicateInputs
    );

    model.updateNodes((nodes) =>
      nodes.map((node) =>
        node.id === 'input-text'
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
      TextPipelineWorkflow as never,
      model,
      inputValues,
      duplicateInputs
    );
    const restored = buildGraphRendererStateFromSnapshot(TextPipelineWorkflow as never, snapshot, injector);

    expect(snapshot.state.ui).toMatchObject({
      duplicateCounts: {
        count: 1,
        text: 1,
      },
    });
    expect(snapshot.state.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'input-text',
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
      count: 1,
      text: 1,
    });
    expect(restored.inputValues).toEqual({
      count: 1,
      text: 'Hello\nWorld\nFoo\nBar\nBaz',
    });
    expect(restored.diagram.getNodes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'input-text',
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
