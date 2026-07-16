import { Model, model, required } from '@decaf-ts/decorator-validation';
import { uielement } from '@decaf-ts/ui-decorators';
import { graph, input, node, output, graphWorkflowDefinitionOf, type GraphWorkflowDefinition } from '@decaf-ts/ui-decorators/graph';
import { CodeInputSchema, LogFlowNode } from '@decaf-ts/integrations/graph/shared';

/**
 * Switch node for the foreach body — routes even-indexed items to the `even`
 * output port and everything else to the `default` port. The condition uses
 * a `CodeCondition` that reads `$index` from the sandbox context (propagated
 * by the Foreach executor via `context.metadata`).
 */
@node('foreach-even-odd-switch', {
  kind: 'core.flow.switch',
  category: 'Flow Control',
  color: '#f97316',
  icon: 'ti-arrows-shuffle',
  width: 120,
  height: 140,
  labels: ['flow', 'switch', 'even-odd'],
  metadata: {
    title: 'Even/Odd Switch',
    description: 'Routes even-indexed items to the Code node and odd-indexed items to the Log node.',
    switch: {
      cases: [
        {
          id: 'even',
          label: 'Even',
          condition: { type: 'code', code: 'return $index % 2 === 0;' },
          outputPort: 'even',
        },
      ],
      defaultPort: 'default',
    },
  },
})
@model()
export class EvenOddSwitchNode extends Model {
  @required()
  @uielement('textarea', { label: 'Input value', placeholder: 'Value to switch on' })
  @input({ handle: 'value' })
  value!: unknown;

  @required()
  @uielement('input', { label: 'Even', placeholder: 'Output for even-indexed items' })
  @output({ handle: 'even' })
  even!: unknown;

  @required()
  @uielement('input', { label: 'Default', placeholder: 'Default output for odd-indexed items' })
  @output({ handle: 'default' })
  default!: unknown;
}

/**
 * Code node for the even branch — logs the item via `console.log` and
 * forwards it on the `result` output port. The default code is stored in
 * `metadata.defaultCode` and used as a fallback when the `code` input port
 * is not wired (which is the case in the demo workflow).
 */
@node('foreach-even-code', {
  kind: 'core.flow.code',
  category: 'Utility',
  color: '#7c3aed',
  icon: 'ti-code',
  width: 96,
  height: 96,
  labels: ['flow', 'code', 'log'],
  metadata: {
    title: 'Log even item',
    description: 'Logs the even-indexed item and forwards it unchanged.',
    timeoutMs: 1000,
    defaultCode: 'console.log("Even item:", $input.data); return $input.data;',
  },
})
@model()
export class LogEvenCodeNode extends Model {
  @required()
  @input({ handle: 'input' })
  input!: CodeInputSchema;

  @required()
  @output({ handle: 'result' })
  result!: unknown;
}

/**
 * Foreach body workflow — processes a single item from the foreach input
 * array. Receives `item` and `index` as workflow inputs (seeded by the
 * Foreach executor). The Switch node routes even-indexed items to the Code
 * node (which logs and forwards) and odd-indexed items to the Log node
 * (which logs and forwards). Both branches output to the body's `result`
 * output port.
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
      id: EvenOddSwitchNode.name,
      kind: 'core.flow.switch',
      label: 'Switch',
      node: EvenOddSwitchNode,
    },
    {
      id: LogEvenCodeNode.name,
      kind: 'core.flow.code',
      label: 'Log Even',
      node: LogEvenCodeNode,
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
      target: EvenOddSwitchNode.name,
      targetPort: 'value',
      label: 'item',
    },
    {
      source: EvenOddSwitchNode.name,
      sourcePort: 'even',
      target: LogEvenCodeNode.name,
      targetPort: 'data',
      label: 'even',
    },
    {
      source: EvenOddSwitchNode.name,
      sourcePort: 'default',
      target: 'OddLogNode',
      targetPort: 'value',
      label: 'odd',
    },
    {
      source: LogEvenCodeNode.name,
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
