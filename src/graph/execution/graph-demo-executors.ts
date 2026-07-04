import {
  GraphNodeExecutorRegistry,
  type GraphExecutionContext,
  type GraphExecutionValues,
  type GraphExecutionEngineConfig,
  GraphExecutionEngine,
  type SwitchNodeMetadata,
  type SwitchCase,
  type SwitchCaseCondition,
  type ConditionExpression,
  ConditionExpressionEvaluator,
} from '@decaf-ts/integrations/graph';
import { ForeachGraphNodeExecutor } from '@decaf-ts/integrations/graph';
import { WhileGraphNodeExecutor } from '@decaf-ts/integrations/graph';
import { UntilGraphNodeExecutor } from '@decaf-ts/integrations/graph';

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
  // Flow-control demo executors (DECAF-32 §22.2.2 — no built-in engine executor)
  'core.flow.map': (input) => ({
    result: { mapped: input['value'] ?? input },
  }),
  'core.flow.delay': (input) => ({
    valueOut: input['value'] ?? input,
  }),
  'core.flow.return': (input) => ({
    result: input['value'] ?? input,
  }),
  'core.flow.merge': (input) => ({
    merged: input['values'] ?? input,
  }),
  'core.flow.if': (input) => ({
    then: input['value'] ?? input,
  }),
  'core.flow.switch': (input, context) => {
    const meta = (context.node.graph?.metadata as Record<string, unknown> | undefined)?.['switch'] as SwitchNodeMetadata | undefined;
    const inputValue = input['value'] ?? input;
    if (!meta || !meta.cases || meta.cases.length === 0) {
      return { [meta?.defaultPort ?? 'default']: inputValue };
    }
    const evaluator = new ConditionExpressionEvaluator();
    for (const c of meta.cases) {
      const cond = c.condition as SwitchCaseCondition;
      if ('op' in cond) {
        try {
          if (evaluator.evaluate(cond as ConditionExpression, inputValue)) {
            return { [c.outputPort]: inputValue };
          }
        } catch {
          // skip unparseable conditions in demo
        }
      }
    }
    return { [meta.defaultPort ?? 'default']: inputValue };
  },
  'core.flow.parallel': (input) => ({
    branches: [input['value'] ?? input],
  }),
  'core.flow.errorBoundary': (input) => ({
    result: input['value'] ?? input,
  }),
  'core.flow.humanApproval': (input) => ({
    approved: input['value'] ?? input,
  }),
  'core.flow.code': (input) => ({
    result: input['input'] ?? input,
  }),
  'core.agent': (input) => ({
    response: `[Agent response] ${String(input['prompt'] ?? '')}`,
    actions: [],
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

/**
 * Creates the demo engine config including loop executors.
 * The loop executors need a back-reference to the engine, so they are
 * registered via the `onEngineCreated` callback after the engine is built.
 */
export function createDemoEngineConfig(): GraphExecutionEngineConfig {
  const registry = new GraphNodeExecutorRegistry();

  registry.register('workflow', { execute: dispatchByTag });
  registry.register('pipeline', { execute: dispatchByTag });
  registry.register('node', { execute: dispatchByTag });
  // Flow-control kinds (DECAF-32 §22.2.2 — no built-in engine executor)
  registry.register('core.flow.map', { execute: dispatchByTag });
  registry.register('core.flow.delay', { execute: dispatchByTag });
  registry.register('core.flow.return', { execute: dispatchByTag });
  registry.register('core.flow.merge', { execute: dispatchByTag });
  registry.register('core.flow.if', { execute: dispatchByTag });
  registry.register('core.flow.switch', { execute: dispatchByTag });
  registry.register('core.flow.parallel', { execute: dispatchByTag });
  registry.register('core.flow.errorBoundary', { execute: dispatchByTag });
  registry.register('core.flow.humanApproval', { execute: dispatchByTag });
  registry.register('core.flow.code', { execute: dispatchByTag });
  registry.register('core.agent', { execute: dispatchByTag });

  return {
    registry,
    defaultOptions: {
      failFast: false,
    },
    onEngineCreated: (engine: GraphExecutionEngine) => {
      registry.register('core.loop.foreach', new ForeachGraphNodeExecutor(engine));
      registry.register('core.loop.while', new WhileGraphNodeExecutor(engine));
      registry.register('core.loop.until', new UntilGraphNodeExecutor(engine));
    },
  };
}

/**
 * @deprecated Use {@link createDemoEngineConfig} instead. This is kept for
 * backward compatibility with code that only needs the registry.
 */
export function createDemoExecutorRegistry(): GraphNodeExecutorRegistry {
  const registry = new GraphNodeExecutorRegistry();
  registry.register('workflow', { execute: dispatchByTag });
  registry.register('pipeline', { execute: dispatchByTag });
  registry.register('node', { execute: dispatchByTag });
  registry.register('core.flow.map', { execute: dispatchByTag });
  registry.register('core.flow.delay', { execute: dispatchByTag });
  registry.register('core.flow.return', { execute: dispatchByTag });
  registry.register('core.flow.merge', { execute: dispatchByTag });
  registry.register('core.flow.if', { execute: dispatchByTag });
  registry.register('core.flow.switch', { execute: dispatchByTag });
  registry.register('core.flow.parallel', { execute: dispatchByTag });
  registry.register('core.flow.errorBoundary', { execute: dispatchByTag });
  registry.register('core.flow.humanApproval', { execute: dispatchByTag });
  registry.register('core.flow.code', { execute: dispatchByTag });
  registry.register('core.agent', { execute: dispatchByTag });
  return registry;
}
