/**
 * @module for-angular/app/models/GraphWorkflowFormModel.spec
 * @summary SAA-68 D3 first-save create form model contract.
 * @description Proves the shared create form model enforces the design spec §13
 * rules: name required, description required with a minimum length, namespace
 * defaulting to the private user namespace.
 */
import {
  GraphWorkflowFormModel,
  GRAPH_WORKFLOW_NAMESPACE_SCOPES,
  GRAPH_WORKFLOW_PRIVATE_NAMESPACE,
} from './GraphWorkflowFormModel';

describe('GraphWorkflowFormModel — create form validation (SAA-68 D3)', () => {
  it('requires the workflow name', () => {
    const errors = new GraphWorkflowFormModel({
      description: 'A sufficiently long description',
    }).hasErrors();

    expect(errors).toBeDefined();
    expect(errors?.['name']).toBeDefined();
  });

  it('requires the workflow description', () => {
    const errors = new GraphWorkflowFormModel({ name: 'Flow' }).hasErrors();

    expect(errors).toBeDefined();
    expect(errors?.['description']).toBeDefined();
  });

  it('enforces the description minimum length', () => {
    const errors = new GraphWorkflowFormModel({
      name: 'Flow',
      description: 'short',
    }).hasErrors();

    expect(errors).toBeDefined();
    expect(errors?.['description']).toBeDefined();
  });

  it('accepts a name and a description of at least ten characters', () => {
    const model = new GraphWorkflowFormModel({
      name: 'Flow',
      description: 'A sufficiently long description',
    });

    expect(model.hasErrors()).toBeUndefined();
  });

  it('defaults the namespace to the private user namespace', () => {
    expect(GRAPH_WORKFLOW_PRIVATE_NAMESPACE).toBe('private');
    expect(new GraphWorkflowFormModel({}).namespace).toBe(
      GRAPH_WORKFLOW_PRIVATE_NAMESPACE
    );
  });

  it('keeps an explicitly supplied namespace', () => {
    expect(
      new GraphWorkflowFormModel({ namespace: 'company' }).namespace
    ).toBe('company');
  });

  it('offers the four namespace scope options', () => {
    expect(GRAPH_WORKFLOW_NAMESPACE_SCOPES.map((scope) => scope.value)).toEqual([
      'private',
      'department',
      'project',
      'company',
    ]);
  });
});
