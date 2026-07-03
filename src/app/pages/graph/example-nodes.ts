import { Model, model, required } from '@decaf-ts/decorator-validation';
import { uielement } from '@decaf-ts/ui-decorators';
import { input, node, output } from '@decaf-ts/ui-decorators/graph';
import type { GraphDemoEdgeBlueprint } from '../../../graph/types';
import { buildForeachBodyWorkflow, buildLoopBodyWorkflow } from './loop-body-workflows';

@node('graph-intake-workflow', {
  kind: 'workflow',
  category: 'Workflow',
  color: '#f97316',
  icon: 'ti-route',
  width: 96,
  height: 96,
  labels: ['entry', 'normalize'],
  metadata: {
    title: 'Ingestion workflow',
    description: 'Turns a loose brief into a normalized request that downstream nodes can consume.',
  },
})
@model()
export class GraphIntakeWorkflow extends Model {
  @required()
  @uielement('textarea', { label: 'Request brief', placeholder: 'Describe the workflow goal' })
  @input({
    handle: 'request',
    connectionRules: {
      allowSelf: false,
      allowedKinds: ['workflow', 'pipeline', 'node'],
    },
  })
  request!: string;

  @required()
  @uielement('input', { label: 'Normalized brief', placeholder: 'Generated brief' })
  @output({
    handle: 'brief',
    connectionRules: {
      allowSelf: false,
      allowedKinds: ['pipeline', 'node'],
    },
  })
  brief!: string;
}

@node('graph-planning-pipeline', {
  kind: 'pipeline',
  category: 'Pipeline',
  color: '#0ea5e9',
  icon: 'ti-git-merge',
  width: 96,
  height: 96,
  labels: ['analysis', 'planning'],
  metadata: {
    title: 'Planning pipeline',
    description: 'Breaks the brief into a concrete plan and annotates the execution steps.',
  },
})
@model()
export class GraphPlanningPipeline extends Model {
  @required()
  @uielement('input', { label: 'Normalized brief', placeholder: 'Input brief' })
  @input({
    handle: 'brief',
    connectionRules: {
      allowSelf: false,
      allowedKinds: ['workflow'],
    },
  })
  brief!: string;

  @required()
  @uielement('textarea', { label: 'Execution plan', placeholder: 'Generated plan' })
  @output({
    handle: 'plan',
    connectionRules: {
      allowSelf: false,
      allowedKinds: ['node', 'workflow'],
    },
  })
  plan!: string;
}

@node('graph-draft-node', {
  kind: 'node',
  category: 'Node',
  color: '#8b5cf6',
  icon: 'ti-pencil',
  width: 96,
  height: 96,
  labels: ['draft', 'transform'],
  metadata: {
    title: 'Draft node',
    description: 'Produces the first structured draft from the plan.',
  },
})
@model()
export class GraphDraftNode extends Model {
  @required()
  @uielement('textarea', { label: 'Execution plan', placeholder: 'Plan input' })
  @input({
    handle: 'plan',
    connectionRules: {
      allowSelf: false,
      allowedKinds: ['pipeline'],
    },
  })
  plan!: string;

  @required()
  @uielement('textarea', { label: 'Draft output', placeholder: 'Draft output' })
  @output({
    handle: 'draft',
    connectionRules: {
      allowSelf: false,
      allowedKinds: ['node'],
    },
  })
  draft!: string;
}

@node('graph-review-node', {
  kind: 'node',
  category: 'Node',
  color: '#14b8a6',
  icon: 'ti-checkup-list',
  width: 96,
  height: 96,
  labels: ['review', 'approve'],
  metadata: {
    title: 'Review node',
    description: 'Validates the draft and emits the approved revision stream.',
  },
})
@model()
export class GraphReviewNode extends Model {
  @required()
  @uielement('textarea', { label: 'Draft', placeholder: 'Draft under review' })
  @input({
    handle: 'draft',
    connectionRules: {
      allowSelf: false,
      allowedKinds: ['node'],
    },
  })
  draft!: string;

  @required()
  @uielement('textarea', { label: 'Approved revision', placeholder: 'Approved revision' })
  @output({
    handle: 'approved',
    connectionRules: {
      allowSelf: false,
      allowedKinds: ['workflow'],
    },
  })
  approved!: string;
}

@node('graph-publish-workflow', {
  kind: 'workflow',
  category: 'Workflow',
  color: '#22c55e',
  icon: 'ti-send',
  width: 96,
  height: 96,
  labels: ['delivery', 'publish'],
  metadata: {
    title: 'Delivery workflow',
    description: 'Packages the approved result and emits the final published artifact.',
  },
})
@model()
export class GraphPublishWorkflow extends Model {
  @required()
  @uielement('textarea', { label: 'Approved revision', placeholder: 'Approved revision' })
  @input({
    handle: 'approved',
    connectionRules: {
      allowSelf: false,
      allowedKinds: ['node'],
    },
  })
  approved!: string;

  @required()
  @uielement('input', { label: 'Published artifact', placeholder: 'Release artifact' })
  @output({
    handle: 'artifact',
    connectionRules: {
      allowSelf: false,
      allowedKinds: ['workflow'],
    },
  })
  artifact!: string;
}

@node('graph-foreach-loop-node', {
  kind: 'core.loop.foreach',
  category: 'Loop',
  color: '#eab308',
  icon: 'ti-repeat',
  width: 96,
  height: 96,
  labels: ['loop', 'iteration', 'foreach'],
  metadata: {
    title: 'Foreach loop',
    description: 'Iterates over an array input and executes the body once per item.',
    loop: {
      body: buildForeachBodyWorkflow(),
      maxIterations: 100,
      itemPort: 'item',
      resultPort: 'result',
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
  @uielement('input', { label: 'Results', placeholder: 'Collected results' })
  @output({ handle: 'results' })
  results!: unknown[];
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
  GraphIntakeWorkflow,
  GraphPlanningPipeline,
  GraphDraftNode,
  GraphReviewNode,
  GraphPublishWorkflow,
  GraphForeachLoopNode,
  GraphWhileLoopNode,
  GraphUntilLoopNode,
] as const;

export type GraphDemoNodeConstructor = (typeof GRAPH_DEMO_NODES)[number];

export const GRAPH_DEMO_EDGES = [
  {
    sourceClass: GraphIntakeWorkflow.name,
    sourcePort: 'brief',
    targetClass: GraphPlanningPipeline.name,
    targetPort: 'brief',
    label: 'brief',
  },
  {
    sourceClass: GraphPlanningPipeline.name,
    sourcePort: 'plan',
    targetClass: GraphDraftNode.name,
    targetPort: 'plan',
    label: 'plan',
  },
  {
    sourceClass: GraphDraftNode.name,
    sourcePort: 'draft',
    targetClass: GraphReviewNode.name,
    targetPort: 'draft',
    label: 'draft',
  },
  {
    sourceClass: GraphReviewNode.name,
    sourcePort: 'approved',
    targetClass: GraphPublishWorkflow.name,
    targetPort: 'approved',
    label: 'approved',
  },
] as const satisfies readonly GraphDemoEdgeBlueprint[];
