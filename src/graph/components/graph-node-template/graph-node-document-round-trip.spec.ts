/**
 * Gap B — editor → canonical document-store round trip.
 *
 * The node CRUD path is document-native: the edit modals return an editor result
 * and the node template writes it into the canonical `GraphWorkflowDocumentStore`.
 * These tests drive the same private write paths the modal confirm handlers call and
 * assert the canonical document carries the edit — and that a `snapshot()` read-back
 * (the save/history source) reflects it. No canvas is rendered: the diagram model
 * service is stubbed, so the write path is exercised in isolation from ng-diagram.
 */
import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';
import type {
  GraphNodeInstance,
  GraphWorkflowDocument,
  SwitchNodeMetadata,
} from '@decaf-ts/as-graph/shared';
import { NgDiagramModelService, NgDiagramService } from 'ng-diagram';

import { GraphNodeCatalogService } from '../../catalog/GraphNodeCatalogService';
import { GraphWorkflowDocumentStore } from '../../document/GraphWorkflowDocumentStore';
import { graphExecutionState } from '../../execution/GraphExecutionStateService';
import { graphInspection } from '../../execution/GraphInspectionStore';
import { graphSelection } from '../../execution/GraphSelectionStore';
import { graphValidity } from '../../validation/GraphWorkflowValidityStore';
import { GraphNodeTemplateComponent } from './graph-node-template.component';
import type { GraphNodeEditResult } from '../graph-node-edit-modal/graph-node-edit-modal.component';
import type { GraphSwitchEditResult } from '../graph-switch-edit-modal/graph-switch-edit-modal.component';

const CODE_DISPLAY = { width: 96, height: 96 };
const SWITCH_DISPLAY = { width: 120, height: 140 };

function documentOf(node: GraphNodeInstance): GraphWorkflowDocument {
  return {
    id: 'round-trip-workflow',
    name: 'Round trip workflow',
    inputs: [],
    outputs: [],
    nodes: [node],
    edges: [],
  };
}

function nodeInstanceOf(
  id: string,
  kind: string,
  overrides: Partial<GraphNodeInstance> = {}
): GraphNodeInstance {
  return { id, kind, label: id, parameters: {}, ...overrides };
}

interface Mounted {
  component: GraphNodeTemplateComponent;
  updatedNodes: unknown[];
}

function mountNodeTemplate(
  nodeId: string,
  kind: string,
  display: { width: number; height: number }
): Mounted & { store: GraphWorkflowDocumentStore } {
  const node = {
    id: nodeId,
    type: kind,
    position: { x: 0, y: 0 },
    size: { width: display.width, height: display.height },
    data: { title: nodeId, kind, ports: [], labels: [], sourceClass: kind },
  };
  const updatedNodes: unknown[] = [];

  // The store is root-scoped, so the component and the test must share one
  // instance. `overrideComponent` must run before the injector is instantiated,
  // so it happens here, before the first `TestBed.inject`.
  TestBed.configureTestingModule({});
  TestBed.overrideComponent(GraphNodeTemplateComponent, {
    set: {
      template: '',
      providers: [
        {
          provide: NgDiagramModelService,
          useValue: {
            nodes: () => [node],
            edges: () => [],
            metadata: () => ({ viewport: { scale: 1 } }),
            updateNodes: (nodes: unknown[]) => {
              updatedNodes.splice(0, updatedNodes.length, ...nodes);
            },
          },
        },
        { provide: NgDiagramService, useValue: { actionState: () => ({ linking: null }) } },
        { provide: ModalController, useValue: { create: jest.fn() } },
        {
          provide: GraphNodeCatalogService,
          useValue: {
            get: () => ({ parameters: [], display }),
            status: () => 'ready',
            failure: () => null,
            reader: () => ({ all: () => [], get: () => undefined, resolve: () => undefined }),
          },
        },
      ],
    },
  });

  const store = TestBed.inject(GraphWorkflowDocumentStore);
  const fixture = TestBed.createComponent(GraphNodeTemplateComponent);
  fixture.componentRef.setInput('node', node);
  fixture.detectChanges();
  return { component: fixture.componentInstance, updatedNodes, store };
}

function callPrivate<T>(component: GraphNodeTemplateComponent, method: string, ...args: unknown[]): T {
  return (component as unknown as Record<string, (...inner: unknown[]) => T>)[method](...args);
}

describe('GraphNodeTemplateComponent — editor result round-trip into the document store (Gap B)', () => {
  beforeEach(() => {
    graphSelection.clear();
    graphExecutionState.reset();
    graphInspection.reset();
    graphValidity.reset();
  });

  afterEach(() => {
    graphSelection.clear();
    graphExecutionState.reset();
    graphInspection.reset();
    graphValidity.reset();
    TestBed.resetTestingModule();
  });

  it('writes a node edit result through dispatchNodeUpdate and reads it back from the document', () => {
    const { component, store } = mountNodeTemplate('code-1', 'core.utility.code', CODE_DISPLAY);
    store.initialize(documentOf(nodeInstanceOf('code-1', 'core.utility.code')));

    const result: GraphNodeEditResult = {
      nodeId: 'code-1',
      inputBindings: {
        value: { mode: 'expression', expression: 'return $input.value * 2;' },
      },
      outputBindings: {},
      parameters: { timeoutMs: '9000' },
      metadata: { defaultCode: 'return 1;' },
    };
    callPrivate(component, 'dispatchNodeUpdate', result.nodeId, result);

    const stored = store.document()?.nodes.find((node) => node.id === 'code-1');
    expect(stored?.inputBindings).toEqual({
      value: { mode: 'expression', expression: 'return $input.value * 2;' },
    });
    expect(stored?.parameters).toEqual({ timeoutMs: '9000' });
    expect(stored?.metadata).toEqual({ defaultCode: 'return 1;' });
    expect(store.snapshot().nodes[0].parameters).toEqual({ timeoutMs: '9000' });
    expect(store.isDirty()).toBe(true);
  });

  it('omits metadata when the edit result carries none', () => {
    const { component, store } = mountNodeTemplate('code-1', 'core.utility.code', CODE_DISPLAY);
    store.initialize(documentOf(nodeInstanceOf('code-1', 'core.utility.code')));

    callPrivate(component, 'dispatchNodeUpdate', 'code-1', {
      nodeId: 'code-1',
      inputBindings: { value: { mode: 'edge' } },
      outputBindings: {},
      parameters: { timeoutMs: '1000' },
    } satisfies GraphNodeEditResult);

    const stored = store.document()?.nodes.find((node) => node.id === 'code-1');
    expect(stored?.inputBindings).toEqual({ value: { mode: 'edge' } });
    expect(stored?.metadata).toBeUndefined();
  });

  it('round-trips a switch case edit into the dual switch parameter shape', () => {
    const { component, store } = mountNodeTemplate('switch-1', 'core.flow.switch', SWITCH_DISPLAY);
    store.initialize(documentOf(nodeInstanceOf('switch-1', 'core.flow.switch')));
    const nodeInstance = store.document()!.nodes[0];

    const switchMetadata: SwitchNodeMetadata = {
      defaultPort: 'fallback',
      hasDefault: true,
      cases: [
        {
          id: 'case-ok',
          label: 'Approved',
          outputPort: 'approved',
          condition: { op: 'eq', left: { path: 'status' }, right: { const: 'ok' } },
        },
      ],
    };
    const result: GraphSwitchEditResult = {
      nodeId: 'switch-1',
      values: {},
      portModes: { value: 'port' },
      outputSplits: ['approved'],
      switchMetadata,
      autoCreateDefaultNode: false,
    };
    callPrivate(component, 'applySwitchEditResult', result, nodeInstance);

    const stored = store.document()?.nodes.find((node) => node.id === 'switch-1');
    const parameters = stored?.parameters as Record<string, unknown>;
    expect(parameters['cases']).toEqual([
      {
        id: 'case-ok',
        label: 'Approved',
        condition: { op: 'eq', left: { path: 'status' }, right: { const: 'ok' } },
        outputPort: 'approved',
      },
    ]);
    expect(parameters['hasDefault']).toBe(true);
    expect(parameters['switch']).toEqual({
      cases: [
        {
          id: 'case-ok',
          label: 'Approved',
          condition: { op: 'eq', left: { path: 'status' }, right: { const: 'ok' } },
          outputPort: 'approved',
        },
      ],
      defaultPort: 'fallback',
      hasDefault: true,
    });
    expect(stored?.inputBindings).toEqual({ value: { mode: 'edge' } });
  });

  it('replays the switch case ports onto the canvas model and clears them for an empty switch', () => {
    const { component, updatedNodes, store } = mountNodeTemplate(
      'switch-1',
      'core.flow.switch',
      SWITCH_DISPLAY
    );
    store.initialize(documentOf(nodeInstanceOf('switch-1', 'core.flow.switch')));
    const nodeInstance = store.document()!.nodes[0];

    callPrivate(component, 'applySwitchEditResult', {
      nodeId: 'switch-1',
      values: {},
      portModes: {},
      outputSplits: [],
      switchMetadata: {
        defaultPort: 'default',
        hasDefault: false,
        cases: [
          {
            id: 'case-a',
            label: 'A',
            outputPort: 'a',
            condition: { op: 'exists', value: { path: 'value' } },
          },
        ],
      },
      autoCreateDefaultNode: false,
    } satisfies GraphSwitchEditResult, nodeInstance);

    expect(updatedNodes).toHaveLength(1);
    const canvasNode = updatedNodes[0] as {
      data: { ports: { property: string }[]; switchMetadata?: SwitchNodeMetadata };
    };
    expect(canvasNode.data.ports.map((port) => port.property)).toContain('a');
    expect(canvasNode.data.switchMetadata?.cases).toHaveLength(1);

    updatedNodes.splice(0, updatedNodes.length);
    callPrivate(component, 'applySwitchEditResult', {
      nodeId: 'switch-1',
      values: {},
      portModes: {},
      outputSplits: [],
      switchMetadata: { defaultPort: 'default', hasDefault: false, cases: [] },
      autoCreateDefaultNode: false,
    } satisfies GraphSwitchEditResult, nodeInstance);

    const emptyParameters = store.document()?.nodes.find((node) => node.id === 'switch-1')
      ?.parameters as Record<string, unknown>;
    expect(emptyParameters['cases']).toEqual([]);
    expect(emptyParameters['hasDefault']).toBe(false);
  });
});
