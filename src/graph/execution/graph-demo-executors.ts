import { GraphNodeExecutorRegistry, type GraphExecutionContext } from '@decaf-ts/integrations/graph';
import type { GraphExecutionValues } from '@decaf-ts/integrations/graph';

type ExecutorFn = (input: GraphExecutionValues, context: GraphExecutionContext) => GraphExecutionValues | Promise<GraphExecutionValues>;

const executorMap: Record<string, ExecutorFn> = {
  'graph-intake-workflow': (input) => ({
    brief: `[Normalized brief] ${String(input['request'] ?? '')}`,
  }),
  'graph-planning-pipeline': (input) => ({
    plan: `[Plan] Steps derived from: ${String(input['brief'] ?? '')}`,
  }),
  'graph-draft-node': (input) => ({
    draft: `[Draft] ${String(input['plan'] ?? '')}`,
  }),
  'graph-review-node': (input) => ({
    approved: `[Approved] ${String(input['draft'] ?? '')}`,
  }),
  'graph-publish-workflow': (input) => ({
    artifact: `[Published] ${String(input['approved'] ?? '')}`,
  }),
};

async function dispatchByTag(input: GraphExecutionValues, context: GraphExecutionContext): Promise<GraphExecutionValues> {
  const tag = context.node.tag;
  const fn = executorMap[tag];
  if (!fn) {
    throw new Error(`No executor registered for node tag: ${tag}`);
  }
  return fn(input, context);
}

export function createDemoExecutorRegistry(): GraphNodeExecutorRegistry {
  const registry = new GraphNodeExecutorRegistry();

  registry.register('workflow', { execute: dispatchByTag });
  registry.register('pipeline', { execute: dispatchByTag });
  registry.register('node', { execute: dispatchByTag });

  return registry;
}
