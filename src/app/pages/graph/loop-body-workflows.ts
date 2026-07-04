import { Model, model, required } from '@decaf-ts/decorator-validation';
import { uielement } from '@decaf-ts/ui-decorators';
import { graph, input, output, graphWorkflowDefinitionOf, type GraphWorkflowDefinition } from '@decaf-ts/ui-decorators/graph';

/**
 * Simple body workflow executed by each foreach iteration.
 * Receives `item` + `index`, returns a processed `result`.
 */
@graph('foreach-body-workflow', {
  kind: 'workflow',
  category: 'Loop Body',
  color: '#eab308',
  icon: 'ti-repeat',
  labels: ['loop', 'body', 'foreach'],
  metadata: {
    title: 'Foreach body',
    description: 'Processes a single item from the foreach input array.',
  },
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
