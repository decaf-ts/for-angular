import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { GraphRendererComponent } from 'src/graph';
import {
  GraphExecutionService,
  GraphExecutionStateMapper,
  GRAPH_EXECUTION_ENGINE_CONFIG,
  createDemoEngineConfig,
} from 'src/graph';
import { graphExecutionState } from 'src/graph';
import { graphWorkflowDefinitionOf } from '@decaf-ts/ui-decorators/graph';
import { GRAPH_TRIGGER_NODES, GRAPH_FLOW_CONTROL_NODES, GRAPH_AGENT_NODES } from '@decaf-ts/integrations/graph/shared';
import { GraphPublishingWorkflow } from './workflow-root';
import { GRAPH_DEMO_NODES } from './example-nodes';

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [
    IonContent,
    GraphRendererComponent,
  ],
  providers: [
    GraphExecutionService,
    {
      provide: GRAPH_EXECUTION_ENGINE_CONFIG,
      useFactory: () => createDemoEngineConfig(),
    },
  ],
  templateUrl: './graph.page.html',
  styleUrl: './graph.page.scss',
})
export class GraphPage implements OnDestroy {
  readonly workflowRoot = GraphPublishingWorkflow;
  private readonly executionService = inject(GraphExecutionService);
  private readonly stateMapper = new GraphExecutionStateMapper();

  readonly isRunning = signal(false);
  readonly lastResult = signal<Record<string, unknown> | null>(null);
  readonly runError = signal<string | null>(null);
  readonly runStatus = signal<string>('idle');
  readonly availableNodes = [...GRAPH_DEMO_NODES, ...GRAPH_TRIGGER_NODES, ...GRAPH_FLOW_CONTROL_NODES, ...GRAPH_AGENT_NODES];

  readonly workflowOutputs = computed(() => {
    const result = this.lastResult();
    if (!result) return [];
    return Object.entries(result).map(([key, value]) => ({ key, value }));
  });

  private eventsSubscription?: { unsubscribe: () => void };

  constructor() {
    this.eventsSubscription = this.executionService.events$.subscribe((event) => {
      const nodes = { ...graphExecutionState.nodeStates() };
      const edges = { ...graphExecutionState.edgeStates() };
      this.stateMapper.apply(event, nodes, edges);
      graphExecutionState.nodeStates.set(nodes);
      graphExecutionState.edgeStates.set(edges);
      this.runStatus.set(event.type);
    });
  }

  ngOnDestroy() {
    this.eventsSubscription?.unsubscribe();
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
      this.runError.set(err instanceof Error ? err.message : String(err));
    } finally {
      this.isRunning.set(false);
    }
  }
}
