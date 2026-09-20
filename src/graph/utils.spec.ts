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
import { GraphNodeCatalogStore } from './catalog/GraphNodeCatalogStore';
import { GRAPH_NODE_MANIFEST_FIXTURES } from './catalog/GraphNodeManifestFixtures';

const MANIFESTS = GRAPH_NODE_MANIFEST_FIXTURES;

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
    const viewModel = buildGraphRendererViewModel(TextPipelineWorkflow as never, {}, {}, MANIFESTS);

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
    const model = buildGraphRendererModel(
      TextPipelineWorkflow as never,
      TestBed.inject(Injector),
      {},
      {},
      null,
      MANIFESTS
    );

    // D2 output-boundary projection: the workflow-output badge adds one node
    // (`output-result`) and its relation one edge to the legacy decorated-root
    // model, so 2 input badges + 1 output badge + 3 member nodes / 5 edges.
    expect(model.getNodes()).toHaveLength(6);
    expect(model.getEdges()).toHaveLength(5);
    expect(model.getNodes()[0]).toMatchObject({
      id: 'input-count',
      type: 'value',
    });
    expect(model.getNodes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'output-result',
          type: 'value',
          data: expect.objectContaining({ role: 'output', property: 'result' }),
        }),
        expect.objectContaining({
          id: 'SplitTextCodeNode',
          type: 'core.flow.code',
        }),
      ])
    );
    expect(model.getEdges()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'ResultLogNode',
          target: 'output-result',
          sourcePort: 'logged',
          targetPort: 'value',
          data: expect.objectContaining({
            engineEdgeId: 'ResultLogNode:logged->$workflow:result',
          }),
        }),
      ])
    );
  });

  it('carries the engine plan-edge id + edge template type on every canvas edge (DECAF-48 §4.4)', () => {
    const viewModel = buildGraphRendererViewModel(TextPipelineWorkflow as never, {}, {}, MANIFESTS);

    expect(viewModel.edges.every((edge) => edge.type === 'graph-edge')).toBe(true);
    const engineIds = viewModel.edges.map((edge) => edge.data.engineEdgeId).filter(Boolean);
    // D2/G3-09: the workflow-output relation now projects as a port→port
    // connection to the output-boundary badge (`$workflow:result`), so it carries an
    // engineEdgeId like every intra-workflow edge.
    expect(engineIds).toHaveLength(viewModel.edges.length);
    expect(engineIds).toEqual(
      expect.arrayContaining([
        '$workflow:count->SplitTextCodeNode:data',
        '$workflow:text->SplitTextCodeNode:data',
        'SplitTextCodeNode:result->GraphForeachLoopNode:items',
        'GraphForeachLoopNode:completed->ResultLogNode:value',
        'ResultLogNode:logged->$workflow:result',
      ])
    );
    expect(viewModel.edges.every((edge) => !(edge.data.engineEdgeId ?? '').includes('undefined'))).toBe(true);
  });

  it('serializes and restores the canonical workflow renderer state', () => {
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
      duplicateInputs,
      null,
      MANIFESTS
    );

    model.updateNodes((nodes) =>
      nodes.map((node) =>
        node.id === 'SplitTextCodeNode'
          ? {
              ...node,
              position: {
                x: 48,
                y: 96,
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

    // R2-2: the snapshot is the canonical wrapper only — no version/definition/state.
    expect(snapshot.document).toBeDefined();
    expect(snapshot.editor?.duplicateCounts).toEqual({
      count: 1,
      text: 1,
    });
    expect(snapshot.document.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'SplitTextCodeNode',
          ui: expect.objectContaining({
            position: {
              x: 48,
              y: 96,
            },
          }),
        }),
      ])
    );

    const catalogue = new GraphNodeCatalogStore();
    catalogue.setManifests(GRAPH_NODE_MANIFEST_FIXTURES);
    const restored = buildGraphRendererStateFromSnapshot(
      TextPipelineWorkflow as never,
      snapshot,
      catalogue,
      injector
    );

    expect(restored.duplicateCounts).toEqual({
      count: 1,
      text: 1,
    });
    expect(restored.diagram.getNodes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'SplitTextCodeNode',
          position: {
            x: 48,
            y: 96,
          },
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
