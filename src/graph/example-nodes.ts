import { Model, model, required } from '@decaf-ts/decorator-validation';
import { uielement } from '@decaf-ts/ui-decorators';
import { input, node, output } from '@decaf-ts/ui-decorators/graph';
import type { GraphDemoEdgeBlueprint } from './types';

@node('graph-intake-workflow', {
  kind: 'workflow',
  category: 'Workflow',
  color: '#f97316',
  icon: 'ti-route',
  width: 300,
  height: 220,
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
  width: 300,
  height: 220,
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
  width: 300,
  height: 220,
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
  width: 300,
  height: 220,
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
  width: 300,
  height: 220,
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

export const GRAPH_DEMO_NODES = [
  GraphIntakeWorkflow,
  GraphPlanningPipeline,
  GraphDraftNode,
  GraphReviewNode,
  GraphPublishWorkflow,
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
