/**
 * @module for-angular/graph/execution/GraphExecutionService
 * @summary Angular service wrapping the graph execution engine.
 * @description Exposes the engine's execute/pin/unpin operations as an injectable Angular service and provides an RxJS observable of execution events. The engine is constructed from an optional {@link GRAPH_EXECUTION_ENGINE_CONFIG} token.
 */
import { InjectionToken, Injectable, inject } from "@angular/core";
import { Subject } from "rxjs";

import {
  GraphExecutionEngine,
  GraphNodeExecutorRegistry,
  type GraphExecutionEvent,
  type GraphExecutionOptions,
  type GraphExecutionResult,
  type GraphExecutionEngineConfig,
  type GraphPinNodeOptions,
  type GraphUnpinNodeOptions,
} from "@decaf-ts/integrations/graph";
import type { GraphWorkflowDefinition } from "@decaf-ts/ui-decorators/graph";

import { GraphExecutionEventSubjectObserver } from "./GraphExecutionEventSubjectObserver";

/**
 * Injection token for configuring the {@link GraphExecutionEngine} used by
 * {@link GraphExecutionService}. Provide a config in your app providers to
 * register custom executors, value store adapters, etc.
 */
export const GRAPH_EXECUTION_ENGINE_CONFIG = new InjectionToken<GraphExecutionEngineConfig>(
  "GRAPH_EXECUTION_ENGINE_CONFIG"
);

/**
 * Injectable Angular service that wraps a {@link GraphExecutionEngine} and
 * exposes execution events as an RxJS observable.
 */
@Injectable()
export class GraphExecutionService {
  private readonly eventsSubject = new Subject<GraphExecutionEvent>();
  readonly events$ = this.eventsSubject.asObservable();

  private readonly engine: GraphExecutionEngine;

  constructor() {
    const config = inject(GRAPH_EXECUTION_ENGINE_CONFIG, { optional: true });
    this.engine = new GraphExecutionEngine(
      config ?? { registry: new GraphNodeExecutorRegistry() }
    );
    this.engine.observe(
      new GraphExecutionEventSubjectObserver(this.eventsSubject)
    );
  }

  /**
   * Executes a workflow and returns the result.
   */
  execute(
    workflow: GraphWorkflowDefinition,
    inputs: Record<string, unknown>,
    options?: GraphExecutionOptions
  ): Promise<GraphExecutionResult> {
    return this.engine.execute(workflow, inputs, options);
  }

  /**
   * Pins a node after a completed run.
   */
  pinNode(options: GraphPinNodeOptions): Promise<void> {
    return this.engine.pinNode(options);
  }

  /**
   * Unpins a node.
   */
  unpinNode(options: GraphUnpinNodeOptions): Promise<void> {
    return this.engine.unpinNode(options);
  }
}
