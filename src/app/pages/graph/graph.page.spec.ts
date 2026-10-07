/**
 * @module for-angular/app/pages/graph/graph.page.spec
 * @summary SAA-68 D4 save-gate and rename contract.
 * @description Proves the editor's save gate: an invalid graph is never saved and
 * surfaces the structured issues, the first create save opens the create modal, a
 * confirmed create assigns a slugged id and persists, and an in-place rename updates
 * the document name and the breadcrumb trail.
 */
import { signal } from '@angular/core';
import type { GraphWorkflowDocument } from '@decaf-ts/as-graph/shared';
import { GraphWorkflowDocumentStore, graphValidity } from 'src/graph';
import { GraphPage } from './graph.page';
import fixture from '../../../../tests/fixtures/graph/text-pipeline.document.json';

const document = fixture as unknown as GraphWorkflowDocument;

/** Builds a GraphPage without running the Angular injector. */
function createPage(operation: string): {
  page: GraphPage;
  saveDocument: jest.Mock;
  configure: jest.Mock;
  documentStore: GraphWorkflowDocumentStore;
} {
  const page = Object.create(GraphPage.prototype) as GraphPage;
  const saveDocument = jest.fn().mockResolvedValue(undefined);
  const configure = jest.fn();
  const documentStore = new GraphWorkflowDocumentStore();
  documentStore.initialize(document);
  Object.assign(page as unknown as Record<string, unknown>, {
    operation,
    workflowId: 'wf-1',
    createdWorkflowId: null,
    workflowName: signal(''),
    runError: signal<string | null>(null),
    runValidationIssues: signal([]),
    createModalOpen: signal(false),
    documentStore,
    mutationDetector: { configure },
    saveService: { saveDocument },
    renderer: undefined,
  });
  return { page, saveDocument, configure, documentStore };
}

describe('GraphPage — save gate and rename (SAA-68 D4)', () => {
  afterEach(() => {
    graphValidity.reset();
  });

  it('blocks the save and surfaces the issues when the graph is invalid', async () => {
    const { page, saveDocument } = createPage('create');
    const issues = [{ code: 'kind.unknown', path: 'nodes[0].kind', message: 'Unknown kind' }];
    graphValidity.applyResult({ valid: false, issues });

    await page.onSaveWorkflow();

    expect(saveDocument).not.toHaveBeenCalled();
    expect(page.createModalOpen()).toBe(false);
    expect(page.runValidationIssues()).toEqual(issues);
  });

  it('opens the create modal on the first valid save of a new workflow', async () => {
    const { page, saveDocument } = createPage('create');
    graphValidity.applyResult({ valid: true, issues: [] });

    await page.onSaveWorkflow();

    expect(page.createModalOpen()).toBe(true);
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it('persists directly on save once the workflow has been created', async () => {
    const { page, saveDocument } = createPage('create');
    (page as unknown as { createdWorkflowId: string | null }).createdWorkflowId = 'wf-1';
    graphValidity.applyResult({ valid: true, issues: [] });

    await page.onSaveWorkflow();

    expect(page.createModalOpen()).toBe(false);
    expect(saveDocument).toHaveBeenCalledWith('wf-1', { document: expect.any(Object) });
  });

  it('assigns a slugged id, renames the document, and persists on create submit', async () => {
    const { page, saveDocument, configure, documentStore } = createPage('create');
    graphValidity.applyResult({ valid: true, issues: [] });

    await page.onCreateSubmitted({
      name: '  My First Flow  ',
      description: 'A sufficiently long description',
      namespace: 'private',
    });

    expect(page.createModalOpen()).toBe(false);
    expect(page.workflowName()).toBe('My First Flow');
    expect(documentStore.document()?.id).toBe('my-first-flow');
    expect(documentStore.document()?.name).toBe('My First Flow');
    expect(configure).toHaveBeenCalledWith('my-first-flow', expect.any(Function));
    expect(saveDocument).toHaveBeenCalledWith('my-first-flow', { document: expect.any(Object) });
  });

  it('ignores a create submit without a name', async () => {
    const { page, saveDocument, documentStore } = createPage('create');

    await page.onCreateSubmitted({
      name: '   ',
      description: 'A sufficiently long description',
    });

    expect(page.createModalOpen()).toBe(false);
    expect(documentStore.document()?.name).toBe(document.name);
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it('renames the workflow document and breadcrumb in place', () => {
    const { page, documentStore } = createPage('update');

    page.onRenameWorkflow('  Renamed Flow  ');

    expect(page.workflowName()).toBe('Renamed Flow');
    expect(documentStore.document()?.name).toBe('Renamed Flow');
  });

  it('ignores an empty rename', () => {
    const { page, documentStore } = createPage('update');
    page.workflowName.set('Original');

    page.onRenameWorkflow('   ');

    expect(page.workflowName()).toBe('Original');
    expect(documentStore.document()?.name).toBe(document.name);
  });
});
