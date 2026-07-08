import { Component, inject, signal, computed, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { GraphRendererComponent } from 'src/graph';
import {
  GraphExecutionService,
  GraphExecutionStateMapper,
  GraphBackendUnavailableError,
} from 'src/graph';
import { graphExecutionState } from 'src/graph';
import { graphWorkflowDefinitionOf } from '@decaf-ts/ui-decorators/graph';
import { GRAPH_TRIGGER_NODES, GRAPH_FLOW_CONTROL_NODES, GRAPH_AGENT_NODES } from '@decaf-ts/integrations/graph/shared';
import { GraphToolbarComponent } from 'src/graph';
import { GraphSaveService } from 'src/graph';
import { GraphAutoSaveService } from 'src/graph';
import { GraphMutationDetectorService } from 'src/graph';
import type { GraphWorkflowSnapshot } from '@decaf-ts/ui-decorators/graph';
import { GraphPublishingWorkflow } from './workflow-root';
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
  readonly workflowRoot = GraphPublishingWorkflow;
  readonly workflowId = 'graph-publishing-workflow';
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

    const workflow = graphWorkflowDefinitionOf(this.workflowRoot as never);
    const inputs: Record<string, unknown> = {
      request: 'Draft a publishing workflow for the next product release.',
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
