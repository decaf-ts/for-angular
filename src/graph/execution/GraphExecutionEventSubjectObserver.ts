/**
 * @module for-angular/graph/execution/GraphExecutionEventSubjectObserver
 * @summary RxJS bridge for graph execution events.
 * @description Adapts the Decaf Observer interface to an RxJS Subject so Angular components can subscribe to graph execution events reactively.
 */
import { Subject } from "rxjs";

import type {
  GraphExecutionEvent,
  GraphExecutionObserver,
} from "@decaf-ts/integrations/graph";

/**
 * Observer that forwards {@link GraphExecutionEvent} instances to an RxJS
 * {@link Subject}.
 */
export class GraphExecutionEventSubjectObserver implements GraphExecutionObserver {
  constructor(private readonly subject: Subject<GraphExecutionEvent>) {}

  async refresh(event: GraphExecutionEvent): Promise<void> {
    this.subject.next(event);
  }
}
