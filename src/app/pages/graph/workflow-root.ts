import { Model, model, required } from '@decaf-ts/decorator-validation';
import { uielement } from '@decaf-ts/ui-decorators';
import { graph, input, output } from '@decaf-ts/ui-decorators/graph';
import {
  GraphDraftNode,
  GraphIntakeWorkflow,
  GraphPlanningPipeline,
  GraphPublishWorkflow,
  GraphReviewNode,
} from './example-nodes';

@graph('graph-workflow-root', {
  kind: 'workflow',
  category: 'Workflow',
  color: '#f59e0b',
  icon: 'ti-sitemap',
  labels: ['workflow', 'root'],
  metadata: {
    title: 'Publishing workflow',
    description:
      'Workflow root that owns the full pipeline and wires workflow inputs and outputs to the decorated node chain.',
  },
  nodes: [
    {
      id: GraphIntakeWorkflow.name,
      kind: 'workflow',
      label: 'Intake',
      node: GraphIntakeWorkflow,
    },
    {
      id: GraphPlanningPipeline.name,
      kind: 'pipeline',
      label: 'Planning',
      node: GraphPlanningPipeline,
    },
    {
      id: GraphDraftNode.name,
      kind: 'node',
      label: 'Draft',
      node: GraphDraftNode,
    },
    {
      id: GraphReviewNode.name,
      kind: 'node',
      label: 'Review',
      node: GraphReviewNode,
    },
    {
      id: GraphPublishWorkflow.name,
      kind: 'workflow',
      label: 'Publish',
      node: GraphPublishWorkflow,
    },
  ],
  relations: [
    {
      source: 'workflow',
      sourcePort: 'request',
      target: GraphIntakeWorkflow.name,
      targetPort: 'request',
      label: 'request',
    },
    {
      source: GraphIntakeWorkflow.name,
      sourcePort: 'brief',
      target: GraphPlanningPipeline.name,
      targetPort: 'brief',
      label: 'brief',
    },
    {
      source: GraphPlanningPipeline.name,
      sourcePort: 'plan',
      target: GraphDraftNode.name,
      targetPort: 'plan',
      label: 'plan',
    },
    {
      source: GraphDraftNode.name,
      sourcePort: 'draft',
      target: GraphReviewNode.name,
      targetPort: 'draft',
      label: 'draft',
    },
    {
      source: GraphReviewNode.name,
      sourcePort: 'approved',
      target: GraphPublishWorkflow.name,
      targetPort: 'approved',
      label: 'approved',
    },
    {
      source: GraphPublishWorkflow.name,
      sourcePort: 'artifact',
      target: 'workflow',
      targetPort: 'artifact',
      label: 'artifact',
    },
  ],
})
@model()
export class GraphPublishingWorkflow extends Model {
  @required()
  @uielement('textarea', {
    label: 'Workflow request',
    placeholder: 'Describe the workflow goal',
    value: 'Draft a publishing workflow for the next product release.',
  })
  @input({
    handle: 'request',
    connectionRules: {
      allowMultiple: true,
    },
  })
  request!: string;

  @required()
  @uielement('input', {
    label: 'Published artifact',
    placeholder: 'Release artifact',
  })
  @output({
    handle: 'artifact',
    connectionRules: {
      allowMultiple: true,
    },
  })
  artifact!: string;
}
