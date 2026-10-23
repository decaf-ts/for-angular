/**
 * @module for-angular/graph/components/boundary-node-template/boundary-node-template.component.spec
 * @summary Direct unit contract for the workflow boundary badge template
 * (SAA-802, from SAA-799).
 * @description Proves the boundary template's pure projections — selection,
 * run status, connected-port collection, direction filtering with default-port
 * ordering, and the delete/open-editor event handlers — without the real
 * `ng-diagram-base-node-template` host (which needs a live diagram injector
 * jsdom lacks). Mirrors `graph-node-template.component.spec.ts` /
 * `graph-ghost-node-template.component.spec.ts`.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgDiagramModelService } from 'ng-diagram';
import { PortDirection, type GraphPortDefinition } from '@decaf-ts/as-graph/shared';

import { GraphBoundaryNodeTemplateComponent } from './boundary-node-template.component';
import type { GraphBoundaryNodeData } from '../../types';
import { graphSelection } from '../../execution/GraphSelectionStore';
import { graphInspection } from '../../execution/GraphInspectionStore';
import { graphExecutionState } from '../../execution/GraphExecutionStateService';

/** The subset of `NgDiagramModelService` the template reads. */
interface ModelServiceStub {
  edges: () => Array<Record<string, unknown>>;
  deleteNodes: jest.Mock;
}

/** Builds the stubbed model service. */
function modelServiceStub(
  edges: Array<Record<string, unknown>> = []
): ModelServiceStub {
  return { edges: () => edges, deleteNodes: jest.fn() };
}

/**
 * Mounts the boundary template with its diagram service stubbed and a blank
 * template, so the pure projections are read against the real singleton stores.
 */
function renderBoundary(
  nodeId: string,
  data: Partial<GraphBoundaryNodeData> = {},
  modelService: ModelServiceStub = modelServiceStub()
): { fixture: ComponentFixture<GraphBoundaryNodeTemplateComponent>; modelService: ModelServiceStub } {
  TestBed.configureTestingModule({});
  TestBed.overrideComponent(GraphBoundaryNodeTemplateComponent, {
    set: {
      template: '',
      providers: [{ provide: NgDiagramModelService, useValue: modelService }],
    },
  });
  const fixture = TestBed.createComponent(GraphBoundaryNodeTemplateComponent);
  fixture.componentRef.setInput('node', { id: nodeId, data: { ports: [], ...data } });
  fixture.detectChanges();
  return { fixture, modelService };
}

/** Builds a boundary port definition with the given overrides. */
function boundaryPort(overrides: Partial<GraphPortDefinition> = {}): GraphPortDefinition {
  return {
    property: 'value',
    name: 'value',
    label: 'Value',
    direction: PortDirection.INPUT,
    required: false,
    hidden: false,
    ...overrides,
  };
}

describe('GraphBoundaryNodeTemplateComponent', () => {
  beforeEach(() => {
    graphSelection.clear();
    graphInspection.reset();
    graphExecutionState.reset();
  });

  afterEach(() => {
    graphSelection.clear();
    graphInspection.reset();
    graphExecutionState.reset();
    TestBed.resetTestingModule();
  });

  describe('isSelected', () => {
    it('is true when this node id is selected', () => {
      graphSelection.setSelected(['n1']);
      const { fixture } = renderBoundary('n1');

      expect(fixture.componentInstance.isSelected()).toBe(true);
    });

    it('is false when only another node id is selected', () => {
      graphSelection.setSelected(['other']);
      const { fixture } = renderBoundary('n1');

      expect(fixture.componentInstance.isSelected()).toBe(false);
    });
  });

  describe('statusLabel', () => {
    it('is empty when the node has no run state', () => {
      const { fixture } = renderBoundary('n1');

      expect(fixture.componentInstance.statusLabel()).toBe('');
    });

    it.each(['running', 'blocked', 'succeeded', 'failed', 'skipped', 'cached'])(
      'renders the %s status string',
      (status) => {
        graphExecutionState.setNodeState('n1', { status });
        const { fixture } = renderBoundary('n1');

        expect(fixture.componentInstance.statusLabel()).toBe(status);
      }
    );

    it("falls back to '' when the state carries no status", () => {
      graphExecutionState.nodeStates.set({ n1: {} as never });
      const { fixture } = renderBoundary('n1');

      expect(fixture.componentInstance.statusLabel()).toBe('');
    });
  });

  describe('connectedPortIds', () => {
    it('collects source and target port ids for this node only', () => {
      const modelService = modelServiceStub([
        { source: 'n1', sourcePort: 'out', target: 'n2', targetPort: 'in' },
        { source: 'n2', sourcePort: 'out2', target: 'n1', targetPort: 'in2' },
        { source: 'n3', sourcePort: 'x', target: 'n4', targetPort: 'y' },
      ]);
      const { fixture } = renderBoundary('n1', {}, modelService);

      expect([...fixture.componentInstance.connectedPortIds()].sort()).toEqual(['in2', 'out']);
    });

    it('is empty when no edges touch the node', () => {
      const { fixture } = renderBoundary('n1');

      expect(fixture.componentInstance.connectedPortIds().size).toBe(0);
    });
  });

  describe('port direction filtering', () => {
    it('keeps only the input ports for inputPorts()', () => {
      const { fixture } = renderBoundary('n1', {
        ports: [
          boundaryPort({ property: 'a', direction: PortDirection.INPUT }),
          boundaryPort({ property: 'b', direction: PortDirection.OUTPUT }),
        ],
      });

      expect(fixture.componentInstance.inputPorts().map((p) => p.property)).toEqual(['a']);
    });

    it('filters output ports and sorts value/default ports last', () => {
      const { fixture } = renderBoundary('n1', {
        ports: [
          boundaryPort({ property: 'value', direction: PortDirection.OUTPUT }),
          boundaryPort({ property: 'other', direction: PortDirection.OUTPUT }),
          boundaryPort({ property: 'zzz', direction: PortDirection.OUTPUT }),
          boundaryPort({ property: 'x', direction: PortDirection.INPUT }),
        ],
      });

      expect(fixture.componentInstance.outputPorts().map((p) => p.property)).toEqual([
        'other',
        'zzz',
        'value',
      ]);
    });

    it('treats a `default` property as a trailing default port', () => {
      const { fixture } = renderBoundary('n1', {
        ports: [
          boundaryPort({ property: 'default', direction: PortDirection.OUTPUT }),
          boundaryPort({ property: 'other', direction: PortDirection.OUTPUT }),
        ],
      });

      expect(fixture.componentInstance.outputPorts().map((p) => p.property)).toEqual([
        'other',
        'default',
      ]);
    });
  });

  describe('deleteNode', () => {
    it('prevents default, stops propagation, then deletes this node', async () => {
      const modelService = modelServiceStub();
      const { fixture } = renderBoundary('n1', {}, modelService);
      const event = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as Event;

      await fixture.componentInstance.deleteNode(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(modelService.deleteNodes).toHaveBeenCalledWith(['n1']);
    });
  });

  describe('openEditor', () => {
    it('prevents default, stops propagation, then opens the inspection panel', () => {
      const { fixture } = renderBoundary('n1');
      const event = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as Event;

      fixture.componentInstance.openEditor(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(graphInspection.openNodeId()).toBe('n1');
    });
  });
});
