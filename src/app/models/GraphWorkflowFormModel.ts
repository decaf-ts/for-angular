import {
  minlength,
  model,
  Model,
  ModelArg,
  required,
} from '@decaf-ts/decorator-validation';
import { uielement, uimodel } from '@decaf-ts/ui-decorators';

/**
 * Namespace scope options offered by the first-save workflow create form
 * (design spec §13 "Saving & validation" + §0.4 namespace decomposition).
 * The private scope is the user's own namespace; the remaining scopes widen the
 * decomposition to the department, project and company levels.
 */
export const GRAPH_WORKFLOW_NAMESPACE_SCOPES: {
  value: string;
  text: string;
}[] = [
  { value: 'private', text: 'graph.workflow.namespace.scope.private' },
  { value: 'department', text: 'graph.workflow.namespace.scope.department' },
  { value: 'project', text: 'graph.workflow.namespace.scope.project' },
  { value: 'company', text: 'graph.workflow.namespace.scope.company' },
];

/**
 * Default private user namespace applied by the first-save create form when the
 * workflow document carries no namespace requirement yet. Composing the fully
 * qualified `<organization>.<department>.<role>` string is the namespace
 * service's job; this value is the private scope's default token.
 */
export const GRAPH_WORKFLOW_PRIVATE_NAMESPACE = 'private';

/**
 * First-save workflow create form (design spec §13 "Saving & validation"):
 * the workflow create modal and the workflow create page share this exact model,
 * so the fields (name required, tags/category optional, description required
 * with a minimum length, namespace scoped) are the same components in both
 * surfaces. Fields render through the for-angular CRUD field component
 * (`ngx-decaf-crud-field`) and the form through `ngx-decaf-crud-form`.
 */
@uimodel('ngx-decaf-crud-form')
@model()
export class GraphWorkflowFormModel extends Model {
  /** Workflow display name (required). */
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'graph.workflow.name.label',
    placeholder: 'graph.workflow.name.placeholder',
  })
  name!: string;

  /** Optional free-form tags, comma-separated in the single text control. */
  @uielement('ngx-decaf-crud-field', {
    label: 'graph.workflow.tags.label',
    placeholder: 'graph.workflow.tags.placeholder',
  })
  tags?: string;

  /** Optional workflow category. */
  @uielement('ngx-decaf-crud-field', {
    label: 'graph.workflow.category.label',
    placeholder: 'graph.workflow.category.placeholder',
  })
  category?: string;

  /** Workflow description (required, minimum length). */
  @required()
  @minlength(10)
  @uielement('ngx-decaf-crud-field', {
    label: 'graph.workflow.description.label',
    placeholder: 'graph.workflow.description.placeholder',
    type: 'textarea',
  })
  description!: string;

  /** Namespace scope (defaults to the private user namespace, §0.4). */
  @uielement('ngx-decaf-crud-field', {
    label: 'graph.workflow.namespace.label',
    type: 'select',
    options: GRAPH_WORKFLOW_NAMESPACE_SCOPES,
  })
  namespace?: string;

  constructor(arg: ModelArg<GraphWorkflowFormModel> = {}) {
    super(arg);
    if (this.namespace === undefined) {
      this.namespace = GRAPH_WORKFLOW_PRIVATE_NAMESPACE;
    }
  }
}
