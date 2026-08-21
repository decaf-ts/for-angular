import { Component, inject, signal, computed, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { GraphRendererComponent } from 'src/graph';
import {
  GraphExecutionService,
  GraphExecutionStateMapper,
  GraphBackendUnavailableError,
} from 'src/graph';
import { graphExecutionState } from 'src/graph';
import { graphRunLog } from 'src/graph';
import { graphInspection } from 'src/graph';
import { graphWorkflowDefinitionOf } from '@decaf-ts/ui-decorators/graph';
import { GRAPH_TRIGGER_NODES, GRAPH_FLOW_CONTROL_NODES, GRAPH_AGENT_NODES } from '@decaf-ts/integrations/graph/shared';
import type { GraphRunLogEntry } from '@decaf-ts/integrations/graph/shared';
import { GraphToolbarComponent } from 'src/graph';
import { GraphSaveService } from 'src/graph';
import { GraphAutoSaveService } from 'src/graph';
import { GraphMutationDetectorService } from 'src/graph';
import type { GraphWorkflowSnapshot } from '@decaf-ts/ui-decorators/graph';
import { TextPipelineWorkflow } from './workflow-root';
import { GRAPH_DEMO_NODES } from './example-nodes';

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [
    IonContent,
    GraphRendererComponent,
    GraphToolbarComponent,
  ],
  providers: [
    GraphExecutionService,
  ],
  templateUrl: './graph.page.html',
  styleUrl: './graph.page.scss',
})
export class GraphPage implements OnInit, OnDestroy {
  readonly workflowRoot = TextPipelineWorkflow;
  readonly workflowId = 'text-pipeline-workflow';
  private readonly executionService = inject(GraphExecutionService);
  private readonly stateMapper = new GraphExecutionStateMapper();
  private readonly saveService = inject(GraphSaveService);
  private readonly autoSave = inject(GraphAutoSaveService);
  private readonly mutationDetector = inject(GraphMutationDetectorService);

  @ViewChild(GraphRendererComponent) renderer!: GraphRendererComponent;

  readonly isRunning = signal(false);
  readonly lastResult = signal<Record<string, unknown> | null>(null);
  readonly runError = signal<string | null>(null);
  readonly runStatus = signal<string>('idle');
  readonly backendAvailable = this.executionService.backendAvailable;
  readonly availableNodes = [...GRAPH_DEMO_NODES, ...GRAPH_TRIGGER_NODES, ...GRAPH_FLOW_CONTROL_NODES, ...GRAPH_AGENT_NODES];

  readonly workflowOutputs = computed(() => {
    const result = this.lastResult();
    if (!result) return [];
    return Object.entries(result).map(([key, value]) => ({ key, value }));
  });

  private eventsSubscription?: { unsubscribe: () => void };

  constructor() {
    this.eventsSubscription = this.executionService.events$.subscribe({
      next: (event) => {
        const nodes = { ...graphExecutionState.nodeStates() };
        const edges = { ...graphExecutionState.edgeStates() };
        this.stateMapper.apply(event, nodes, edges);
        graphExecutionState.nodeStates.set(nodes);
        graphExecutionState.edgeStates.set(edges);

        if (event.type === 'graph.run.log' && event.payload) {
          graphRunLog.append(event.payload as GraphRunLogEntry);
        }

        if (event.type === 'workflow.completed' || event.type === 'workflow.failed') {
          graphRunLog.setOpen(true);
          // Populate per-node I/O for inspection (DECAF-48 §4.6). Always fetch
          // the run the user initiated (lastRunId) instead of trusting the
          // `runId` inside the SSE payload, which is attacker-influenceable
          // and could point at another user's run (SAA-116 F2).
          const runId = this.executionService.lastRunId();
          if (runId) {
            void this.executionService.fetchInspections(runId).then((inspections) => {
              graphInspection.setMany(inspections);
            });
          }
        }

        this.runStatus.set(event.type);
      },
      error: () => {
        // SSE error — non-fatal; the execution result already arrived via HTTP.
      },
    });
  }

  ngOnInit(): void {
    void this.executionService.checkBackend();
    this.mutationDetector.configure(this.workflowId, () => {
      return this.renderer?.buildSnapshot() ?? null;
    });
  }

  ngOnDestroy() {
    this.eventsSubscription?.unsubscribe();
  }

  onNodeDragEnded(): void {
    this.mutationDetector.recordMutation('node-position');
  }

  onEdgeDrawn(): void {
    this.mutationDetector.recordMutation('edge-connect');
  }

  onElementsRemoved(): void {
    this.mutationDetector.recordMutation('edge-disconnect');
  }

  onRestoreSnapshot(snapshot: GraphWorkflowSnapshot): void {
    this.renderer?.restoreFromSnapshot(snapshot);
  }

  async onSaveWorkflow(): Promise<void> {
    const snapshot = this.renderer?.buildSnapshot();
    if (!snapshot) return;
    try {
      await this.saveService.save(this.workflowId, snapshot);
    } catch (err) {
      this.runError.set(err instanceof Error ? err.message : String(err));
    }
  }

  async runWorkflow() {
    this.isRunning.set(true);
    this.runError.set(null);
    graphExecutionState.reset();
    graphRunLog.reset();
    graphInspection.reset();
    graphRunLog.setOpen(true);

    // Seed canvas member nodes/edges as BLOCKED (waiting on upstream deps).
    // The engine never emits BLOCKED (DECAF-48 §4.4); NODE_STATE_CHANGED /
    // EDGE_STATE_CHANGED transitions override these as the run progresses.
    // Input boundary nodes are excluded — the engine references workflow
    // inputs via plan-edge ids, not as engine nodes, so they stay neutral.
    const viewModel = this.renderer?.viewModel();
    if (viewModel) {
      const nodeIds = viewModel.nodes.map((node) => node.id);
      // Canvas edges carry the engine plan-edge id nested under `edge.data`
      // (buildGraphRendererViewModel), while the store's markAllBlocked reads
      // it top-level — map the shape so both the canvas id and the engine
      // plan-edge id get seeded as blocked (DECAF-48 §4.4).
      const edges = viewModel.edges.map((edge) => ({
        id: edge.id,
        engineEdgeId: edge.data?.engineEdgeId,
      }));
      graphExecutionState.markAllBlocked(nodeIds, edges);
    }

    const workflow = graphWorkflowDefinitionOf(this.workflowRoot as never);
    const inputs: Record<string, unknown> = {
      count: 1,
      text: 'Hello\nWorld\nFoo\nBar\nBaz',
    };

    try {
      const result = await this.executionService.execute(workflow, inputs);
      this.lastResult.set(result.outputs as Record<string, unknown>);
      this.runStatus.set(result.status);
    } catch (err) {
      if (err instanceof GraphBackendUnavailableError) {
        this.backendAvailable.set(false);
      }
      this.runError.set(err instanceof Error ? err.message : String(err));
    } finally {
      this.isRunning.set(false);
    }
  }
}
// trigger rebuild
