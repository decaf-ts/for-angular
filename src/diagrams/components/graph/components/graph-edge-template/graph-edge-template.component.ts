/**
 * @module for-angular/graph/components/graph-edge-template
 * @summary Custom ng-diagram edge template lighting edges from run state.
 * @description Wraps `NgDiagramBaseEdgeComponent` with the run visual state
 * (DECAF-48 §4.4) applied as a modifier class. State is resolved through the
 * shared `graphExecutionState` store keyed by the engine's plan-edge id
 * (`data.engineEdgeId`), because the engine emits EDGE_STATE_CHANGED /
 * EDGE_VALUE_ROUTED with plan-edge ids while canvas edges carry positional
 * ids (`edge-N`).
 */
import { Component, computed, input } from '@angular/core';
import {
  NgDiagramBaseEdgeComponent,
  NgDiagramBaseEdgeLabelComponent,
  type Edge,
  type EdgeLabelPosition,
} from 'ng-diagram';
import { graphExecutionState } from '../../execution/GraphExecutionStateService';

/**
 * Custom ng-diagram edge template applying the run's visual state to every
 * canvas edge. Reads the shared {@link graphExecutionState} store through the
 * engine plan-edge id carried on the canvas edge data, binding state-specific
 * modifier classes (`graph-edge--running` / `--blocked` / `--succeeded` /
 * `--failed` / `--skipped`) that restyle the stroke. Editing is out of scope:
 * this template only mirrors the engine's edge execution state onto the line.
 */
@Component({
  selector: 'ngx-decaf-graph-edge-template',
  standalone: true,
  imports: [NgDiagramBaseEdgeComponent, NgDiagramBaseEdgeLabelComponent],
  templateUrl: './graph-edge-template.component.html',
  styleUrl: './graph-edge-template.component.scss',
})
export class GraphEdgeTemplateComponent {
  /** The canvas edge being rendered. */
  readonly edge = input.required<Edge>();

  private readonly data = computed<{ label?: string; positionOnEdge?: EdgeLabelPosition; engineEdgeId?: string }>(
    () => (this.edge().data as { label?: string; positionOnEdge?: EdgeLabelPosition; engineEdgeId?: string }) ?? {}
  );

  /** Optional edge label rendered at the configured point on the line. */
  readonly label = computed(() => this.data().label);

  /** Label anchor position along the edge (default `0.5`, i.e. the middle). */
  readonly positionOnEdge = computed<EdgeLabelPosition>(() => this.data().positionOnEdge ?? 0.5);

  /**
   * Visual state of the edge (`running`/`blocked`/`succeeded`/`failed`/
   * `skipped`). Resolved via the engine plan-edge id carried on the canvas
   * edge data; falls back to the positional canvas id (runtime edges).
   */
  readonly state = computed(() => {
    const engineEdgeId = this.data().engineEdgeId ?? this.edge().id;
    const state = graphExecutionState.edgeStates()[engineEdgeId];
    return state?.status ?? state?.visualState ?? '';
  });

  /** Whether the edge is currently executing (faded green). */
  readonly isRunning = computed(() => this.state() === 'running');
  /** Whether the edge waits on upstream nodes (faded yellow, DECAF-48 §4.4). */
  readonly isBlocked = computed(() => this.state() === 'blocked');
  /** Whether the edge carried its value successfully (green). */
  readonly isSucceeded = computed(() => this.state() === 'succeeded');
  /** Whether the edge's run failed (red, thickened stroke). */
  readonly isFailed = computed(() => this.state() === 'failed');
  /** Whether the edge was not executed after a failed run (faded/disabled). */
  readonly isSkipped = computed(() => this.state() === 'skipped');
}
