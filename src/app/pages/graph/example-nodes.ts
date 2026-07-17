import { Model, model, required } from '@decaf-ts/decorator-validation';
import { uielement } from '@decaf-ts/ui-decorators';
import { connection, input, node, output } from '@decaf-ts/ui-decorators/graph';
import type { GraphDemoEdgeBlueprint } from '../../../graph/types';
import { buildForeachBodyWorkflow, buildLoopBodyWorkflow } from './loop-body-workflows';

@node('graph-foreach-loop-node', {
  kind: 'core.loop.foreach',
  category: 'Loop',
  color: '#eab308',
  icon: 'ti-repeat',
  width: 120,
  height: 140,
  labels: ['loop', 'iteration', 'foreach'],
  metadata: {
    title: 'Foreach loop',
    description: 'Iterates over an array input and executes the body once per item (or per slice of items).',
    loop: {
      body: buildForeachBodyWorkflow(),
      maxIterations: 100,
      itemPort: 'item',
      resultPort: 'result',
      slice: 1,
    },
  },
})
@model()
export class GraphForeachLoopNode extends Model {
  @required()
  @uielement('textarea', { label: 'Items', placeholder: 'Array to iterate over' })
  @input({ handle: 'items' })
  items!: unknown[];

  @required()
  @uielement('input', { label: 'Slice size', placeholder: 'Items per iteration (default 1)' })
  @input({ handle: 'slice' })
  slice!: number;

  @required()
  @output({ handle: 'body' })
  body!: unknown;

  @required()
  @connection({ handle: 'loop', connectionRules: { allowSelf: true, maxConnections: 1 } })
  loop!: unknown;

  @required()
  @output({ handle: 'completed' })
  completed!: unknown[];
}

@node('graph-while-loop-node', {
  kind: 'core.loop.while',
  category: 'Loop',
  color: '#0891b2',
  icon: 'ti-arrows-loop',
  width: 96,
  height: 96,
  labels: ['loop', 'conditional', 'while'],
  metadata: {
    title: 'While loop',
    description: 'Repeats the body while the condition is true (pre-condition).',
    loop: {
      body: buildLoopBodyWorkflow(),
      maxIterations: 50,
      statePort: 'state',
      condition: {
        type: 'lessThan' as never,
        left: 'iteration',
        right: 3,
      },
    },
  },
})
@model()
export class GraphWhileLoopNode extends Model {
  @required()
  @uielement('input', { label: 'State', placeholder: 'Initial state' })
  @input({ handle: 'state' })
  state!: unknown;

  @required()
  @uielement('input', { label: 'Final state', placeholder: 'Final state after loop' })
  @output({ handle: 'state' })
  stateOut!: unknown;
}

@node('graph-until-loop-node', {
  kind: 'core.loop.until',
  category: 'Loop',
  color: '#db2777',
  icon: 'ti-player-stop',
  width: 96,
  height: 96,
  labels: ['loop', 'conditional', 'until'],
  metadata: {
    title: 'Until loop',
    description: 'Repeats the body until the condition is true (post-condition, runs at least once).',
    loop: {
      body: buildLoopBodyWorkflow(),
      maxIterations: 50,
      statePort: 'state',
      condition: {
        type: 'greaterThanOrEqual' as never,
        left: 'iteration',
        right: 2,
      },
    },
  },
})
@model()
export class GraphUntilLoopNode extends Model {
  @required()
  @uielement('input', { label: 'State', placeholder: 'Initial state' })
  @input({ handle: 'state' })
  state!: unknown;

  @required()
  @uielement('input', { label: 'Final state', placeholder: 'Final state after loop' })
  @output({ handle: 'state' })
  stateOut!: unknown;
}

export const GRAPH_DEMO_NODES = [
  GraphForeachLoopNode,
  GraphWhileLoopNode,
  GraphUntilLoopNode,
] as const;

export type GraphDemoNodeConstructor = (typeof GRAPH_DEMO_NODES)[number];

export const GRAPH_DEMO_EDGES = [
] as const satisfies readonly GraphDemoEdgeBlueprint[];
