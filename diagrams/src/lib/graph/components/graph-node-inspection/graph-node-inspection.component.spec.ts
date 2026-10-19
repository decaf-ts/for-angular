/**
 * @module for-angular/graph/components/graph-node-inspection/graph-node-inspection.component.spec
 * @summary SAA-722 node inspection -> I/O viewer wiring.
 * @description Proves the three-pane split view forwards the open node's run
 * payload identity (`runId`, `nodeId`) and the pane field (`inputs` / `outputs`)
 * to each reused `app-graph-io-viewer`, so the viewer can download the full
 * payload for exactly the pane it renders.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgDiagramModelService } from 'ng-diagram';
import {
  GraphVisualState,
  type GraphNodeInspectionPayload,
} from '@decaf-ts/as-graph/shared';

import { GraphNodeInspectionComponent } from './graph-node-inspection.component';
import { GraphIoViewerComponent } from '../graph-io-viewer/graph-io-viewer.component';
import { graphInspection } from '../../execution/GraphInspectionStore';

const NODES = [
  {
    id: 'code-1',
    position: { x: 0, y: 0 },
    type: 'core.utility.code',
    data: {
      title: 'Code',
      kind: 'core.utility.code',
      sourceClass: 'CodeGraphNode',
      ports: [],
    },
  },
];

/** A succeeded node payload with distinct inputs/outputs. */
function succeededPayload(): GraphNodeInspectionPayload {
  return {
    runId: 'run-42',
    workflowId: 'wf-1',
    nodeId: 'code-1',
    state: GraphVisualState.SUCCEEDED,
    inputs: { value: 21 },
    outputs: { result: 42 },
  };
}

/** Mounts the split view against the open singleton inspection store. */
function render(runState: 'idle' | 'pending' | 'ready' | 'failed' = 'ready'): ComponentFixture<GraphNodeInspectionComponent> {
  TestBed.configureTestingModule({
    providers: [{ provide: NgDiagramModelService, useValue: { nodes: () => NODES } }],
  });
  const fixture = TestBed.createComponent(GraphNodeInspectionComponent);
  fixture.componentRef.setInput('runState', runState);
  fixture.detectChanges();
  return fixture;
}

describe('GraphNodeInspectionComponent — I/O viewer wiring (SAA-722)', () => {
  beforeEach(() => {
    graphInspection.reset();
  });

  afterEach(() => {
    graphInspection.reset();
    TestBed.resetTestingModule();
  });

  it('forwards runId, nodeId and the pane field to each I/O viewer', () => {
    graphInspection.set(succeededPayload());
    graphInspection.open('code-1');

    const fixture = render('ready');
    const viewers = fixture.debugElement.queryAll(By.directive(GraphIoViewerComponent));

    expect(viewers).toHaveLength(2);

    const inputs = viewers[0].componentInstance;
    expect(inputs.title()).toBe('Run inputs');
    expect(inputs.field()).toBe('inputs');
    expect(inputs.runId()).toBe('run-42');
    expect(inputs.nodeId()).toBe('code-1');
    expect(inputs.value()).toEqual({ value: 21 });

    const outputs = viewers[1].componentInstance;
    expect(outputs.title()).toBe('Run outputs');
    expect(outputs.field()).toBe('outputs');
    expect(outputs.runId()).toBe('run-42');
    expect(outputs.nodeId()).toBe('code-1');
    expect(outputs.value()).toEqual({ result: 42 });
  });

  it('keeps the output viewer on the error path without a download identity', () => {
    graphInspection.set({
      runId: 'run-42',
      workflowId: 'wf-1',
      nodeId: 'code-1',
      state: GraphVisualState.FAILED,
      inputs: { value: null },
      error: { name: 'GraphNodeError', message: 'boom' },
    });
    graphInspection.open('code-1');

    const fixture = render('ready');
    const viewers = fixture.debugElement.queryAll(By.directive(GraphIoViewerComponent));

    expect(viewers).toHaveLength(2);
    const outputs = viewers[1].componentInstance;
    expect(outputs.error()).toEqual({ name: 'GraphNodeError', message: 'boom' });
    expect(outputs.canDownload()).toBe(false);
    expect(outputs.runId()).toBe('');
    expect(outputs.nodeId()).toBe('');
  });

  it('renders no I/O viewer while the node has no payload and the run is idle', () => {
    graphInspection.open('code-1');

    const fixture = render('idle');
    const viewers = fixture.debugElement.queryAll(By.directive(GraphIoViewerComponent));

    expect(viewers).toHaveLength(0);
  });
});
