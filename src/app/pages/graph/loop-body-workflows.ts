import { Model, model, required } from '@decaf-ts/decorator-validation';
import { uielement } from '@decaf-ts/ui-decorators';
import {
  CodeFlowNode,
  LogFlowNode,
  SwitchFlowNode,
  graph,
  graphWorkflowDefinitionOf,
  input,
  output,
  type GraphWorkflowDefinition,
} from '@decaf-ts/ui-decorators/graph';

/** Switch metadata for the foreach body — routes even-indexed items to the
 *  `even` output port and everything else to the `default` port. The
 *  condition is a `CodeCondition` reading `$index` from the sandbox context
 *  (propagated by the Foreach executor via `context.metadata`). */
const evenOddSwitchMetadata: Record<string, unknown> = {
  switch: {
    cases: [
      {
        id: 'even',
        label: 'Even',
        condition: { type: 'code', code: 'return $index % 2 === 0;' } as never,
        outputPort: 'even',
      },
    ],
    defaultPort: 'default',
    hasDefault: true,
  },
} as never;

/** The `defaultCode` fallback used when the shared Code node's `code` input
 *  port is not wired (which is the case in the demo body workflow). */
const logEvenCodeMetadata: Record<string, unknown> = {
  defaultCode: 'console.log("Even item:", $input.data); return $input.data;',
};

/** Metadata patch on the shared Code node in the even branch — logs the item
 *  via `console.log` and forwards it on the `result` output port. */
const logEvenNodeMetadata = {
  title: 'Log even item',
  description: 'Logs the even-indexed item and forwards it unchanged.',
  timeoutMs: 1000,
  ...logEvenCodeMetadata,
};

/**
 * Foreach body workflow — processes a single item from the foreach input
 * array. Receives `item` and `index` as workflow inputs (seeded by the
 * Foreach executor). Composed exclusively from system node kinds
 * (`core.flow.switch`, `core.flow.code`, `core.flow.log`): the Switch node
 * routes even-indexed items to the Code node (which logs and forwards) and
 * odd-indexed items to the Log node (which logs and forwards). Both branches
 * output to the body's `result` output port.
 */
@graph('foreach-body-workflow', {
  kind: 'workflow',
  category: 'Loop Body',
  color: '#eab308',
  icon: 'ti-repeat',
  labels: ['loop', 'body', 'foreach'],
  metadata: {
    title: 'Foreach body',
    description: 'Processes a single item: Switch (even/odd) → Code (log) / Log (discard).',
  },
  nodes: [
    {
      id: 'EvenOddSwitchNode',
      kind: 'core.flow.switch',
      label: 'Switch',
      node: SwitchFlowNode,
      metadata: evenOddSwitchMetadata,
    },
    {
      id: 'LogEvenCodeNode',
      kind: 'core.flow.code',
      label: 'Log Even',
      node: CodeFlowNode,
      metadata: logEvenNodeMetadata,
    },
    {
      id: 'OddLogNode',
      kind: 'core.flow.log',
      label: 'Log Odd',
      node: LogFlowNode,
    },
  ],
  relations: [
    {
      source: 'workflow',
      sourcePort: 'item',
      target: 'EvenOddSwitchNode',
      targetPort: 'value',
      label: 'item',
    },
    {
      source: 'EvenOddSwitchNode',
      sourcePort: 'even',
      target: 'LogEvenCodeNode',
      targetPort: 'data',
      label: 'even',
    },
    {
      source: 'EvenOddSwitchNode',
      sourcePort: 'default',
      target: 'OddLogNode',
      targetPort: 'value',
      label: 'odd',
    },
    {
      source: 'LogEvenCodeNode',
      sourcePort: 'result',
      target: 'workflow',
      targetPort: 'result',
      label: 'result',
    },
    {
      source: 'OddLogNode',
      sourcePort: 'logged',
      target: 'workflow',
      targetPort: 'result',
      label: 'result',
    },
  ],
})
@model()
export class ForeachBodyWorkflow extends Model {
  @required()
  @uielement('input', { label: 'Item', placeholder: 'Current item' })
  @input({ handle: 'item' })
  item!: unknown;

  @required()
  @uielement('input', { label: 'Processed item', placeholder: 'Processed result' })
  @output({ handle: 'result' })
  result!: unknown;
}

/**
 * Simple body workflow executed by each while/until iteration.
 * Receives `state` + `iteration`, returns updated `state`.
 */
@graph('loop-body-workflow', {
  kind: 'workflow',
  category: 'Loop Body',
  color: '#0891b2',
  icon: 'ti-arrows-loop',
  labels: ['loop', 'body', 'conditional'],
  metadata: {
    title: 'Conditional loop body',
    description: 'Transforms the loop state on each iteration.',
  },
})
@model()
export class LoopBodyWorkflow extends Model {
  @required()
  @uielement('input', { label: 'State', placeholder: 'Current state' })
  @input({ handle: 'state' })
  state!: unknown;

  @required()
  @uielement('input', { label: 'Updated state', placeholder: 'Next state' })
  @output({ handle: 'state' })
  stateOut!: unknown;
}

/**
 * Builds the GraphWorkflowDefinition objects used as `metadata.loop.body`
 * by the loop node executors. These are derived from the decorated classes
 * above so the engine can plan and execute them.
 */
export function buildForeachBodyWorkflow(): GraphWorkflowDefinition {
  return graphWorkflowDefinitionOf(ForeachBodyWorkflow as never);
}

export function buildLoopBodyWorkflow(): GraphWorkflowDefinition {
  return graphWorkflowDefinitionOf(LoopBodyWorkflow as never);
}

/**
 * Loop-body `metadata.loop` patch supplying the demo's body workflow to the
 * shared loop node declarations (the shared classes carry no `body` — the
 * body is app-side demo content).
 */
export function foreachLoopMetadata(maxIterations = 100): Record<string, unknown> {
  return {
    loop: {
      body: buildForeachBodyWorkflow(),
      maxIterations,
      itemPort: 'item',
      resultPort: 'result',
      slice: 1,
    },
  };
}

/** While/until loop `metadata.loop` patch for the loop-body workflow above. */
export function conditionalLoopMetadata(maxIterations = 50): Record<string, unknown> {
  return {
    loop: {
      body: buildLoopBodyWorkflow(),
      maxIterations,
      statePort: 'state',
    },
  };
}
