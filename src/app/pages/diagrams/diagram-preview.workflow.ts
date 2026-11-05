import { Model, model } from '@decaf-ts/decorator-validation';
import { graph } from '@decaf-ts/as-graph/shared';

/**
 * Minimal two-node workflow used by the standalone `/diagrams` demo page.
 * It intentionally uses the same decorated-root authoring contract as the
 * `/graph` editor but stays independent from the editor's saved documents.
 */
@graph('Two-step pipeline', {
  kind: 'workflow',
  category: 'Workflow',
  color: '#0ea5e9',
  icon: 'ti-sitemap',
  labels: ['workflow', 'preview'],
  metadata: {
    title: 'Two-step pipeline',
    description:
      'A code node feeds a log node so the diagrams canvas can be inspected outside the workflow editor.',
  },
  nodes: [
    {
      id: 'DiagramCodeNode',
      kind: 'core.utility.code',
      label: 'Transform',
      metadata: {
        title: 'Transform',
        description: 'Uppercases the incoming value.',
        timeoutMs: 1000,
        defaultCode: 'return String($input.value ?? "").toUpperCase();',
      },
    },
    {
      id: 'DiagramLogNode',
      kind: 'core.flow.log',
      label: 'Log result',
    },
  ],
  relations: [
    {
      source: 'DiagramCodeNode',
      sourcePort: 'result',
      target: 'DiagramLogNode',
      targetPort: 'value',
      label: 'result',
    },
  ],
})
@model()
export class DiagramPreviewWorkflow extends Model {}
