import { Model, model } from '@decaf-ts/decorator-validation';
import { output, node } from '@decaf-ts/ui-decorators/graph';

@node('graph-input-value-node', {
  kind: 'value',
  category: 'Boundary',
  color: '#0f766e',
  icon: 'ti-circle-plus',
  labels: ['workflow', 'input', 'value'],
  metadata: {
    title: 'Workflow input value',
    description: 'Reusable canvas value node representing a workflow input.',
  },
})
@model()
export class GraphInputValueNode extends Model {
  @output({
    handle: 'value',
    connectionRules: {
      allowMultiple: true,
    },
  })
  value!: unknown;
}

