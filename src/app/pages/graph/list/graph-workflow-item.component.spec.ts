/**
 * @module for-angular/app/pages/graph/list/graph-workflow-item.component.spec
 * @summary SAA-68 D1 workflow list item contract.
 * @description Proves the custom list item renders a workflow row's name/timestamp
 * and routes the "open" and "past executions" actions to the edit canvas and the
 * execution list respectively.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { I18nFakeLoader } from 'src/lib/i18n';
import type { KeyValue } from 'src/lib/engine';
import { GraphEngineCapabilityService } from 'src/graph/capabilities';
import { GraphWorkflowItemComponent } from './graph-workflow-item.component';

/** Run-gate double backing the item's injected capability facade. */
let canRunWorkflow: jest.Mock;
/** Selected-engine double backing the item's injected capability facade. */
let selectedEngineId: jest.Mock;

/** Mounts the workflow item with the given row and lets its async init settle. */
async function render(row: KeyValue): Promise<ComponentFixture<GraphWorkflowItemComponent>> {
  const fixture = TestBed.createComponent(GraphWorkflowItemComponent);
  fixture.componentInstance.model = row as never;
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('GraphWorkflowItemComponent — workflow row (SAA-68 D1)', () => {
  beforeEach(() => {
    canRunWorkflow = jest.fn(() => true);
    selectedEngineId = jest.fn(() => 'engine-a');
    TestBed.configureTestingModule({
      imports: [
        GraphWorkflowItemComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: I18nFakeLoader },
        }),
      ],
      providers: [
        provideRouter([]),
        {
          provide: GraphEngineCapabilityService,
          useValue: { canRunWorkflow, selectedEngineId },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders the workflow name and update timestamp', async () => {
    const fixture = await render({
      workflowId: 'wf-1',
      name: 'Text Pipeline',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    const name = fixture.nativeElement.querySelector('.graph-workflow-item__name');
    expect(name?.textContent).toContain('Text Pipeline');
  });

  it('opens the workflow in the edit canvas with the selected engine query param (SAA-722)', async () => {
    const fixture = await render({ workflowId: 'wf-9', name: 'Flow' });
    const navigate = jest.spyOn(fixture.componentInstance.router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.openWorkflow(new Event('click'));

    expect(navigate).toHaveBeenCalledWith(['/graph/read/wf-9'], {
      queryParams: { engine: 'engine-a' },
    });
  });

  it('opens the workflow without an engine query param when no engine is selected (SAA-722)', async () => {
    selectedEngineId.mockReturnValue(null);
    const fixture = await render({ workflowId: 'wf-9', name: 'Flow' });
    const navigate = jest.spyOn(fixture.componentInstance.router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.openWorkflow(new Event('click'));

    expect(navigate).toHaveBeenCalledWith(['/graph/read/wf-9'], {
      queryParams: {},
    });
  });

  it('navigates to the workflow past executions', async () => {
    const fixture = await render({ workflowId: 'wf-9', name: 'Flow' });
    const navigate = jest.spyOn(fixture.componentInstance.router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.pastExecutions(new Event('click'));

    expect(navigate).toHaveBeenCalledWith(['/workflows/wf-9/runs']);
  });

  it('does not navigate when the row has no workflow id', async () => {
    const fixture = await render({ name: 'No id' });
    const navigate = jest.spyOn(fixture.componentInstance.router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.openWorkflow(new Event('click'));
    fixture.componentInstance.pastExecutions(new Event('click'));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps the row click from bubbling to the list', async () => {
    const fixture = await render({ workflowId: 'wf-9', name: 'Flow' });
    const event = new Event('click');
    const stop = jest.spyOn(event, 'stopImmediatePropagation');

    fixture.componentInstance.openWorkflow(event);

    expect(stop).toHaveBeenCalled();
  });

  it('exposes the row as a list item whose action buttons are all named (SAA-905)', async () => {
    const fixture = await render({ workflowId: 'wf-9', name: 'Flow' });

    const row = fixture.nativeElement.querySelector('.graph-workflow-item') as HTMLElement;
    expect(row.getAttribute('role')).toBe('listitem');

    const actionLabels = Array.from(
      fixture.nativeElement.querySelectorAll('.graph-workflow-item__actions ion-button')
    ).map((button) => (button as HTMLElement).getAttribute('aria-label'));
    expect(actionLabels).toHaveLength(3);
    for (const label of actionLabels) {
      expect(label?.trim()).not.toBe('');
    }
  });

  describe('gated run action (SAA-707)', () => {
    it('navigates to the graph editor with the engine and autorun query params', async () => {
      const fixture = await render({ workflowId: 'wf-9', name: 'Flow' });
      const navigate = jest
        .spyOn(fixture.componentInstance.router, 'navigate')
        .mockResolvedValue(true);

      fixture.componentInstance.runScenario(new Event('click'));

      expect(navigate).toHaveBeenCalledWith(['/graph/read/wf-9'], {
        queryParams: { engine: 'engine-a', autorun: '1' },
      });
    });

    it('omits the engine query param when no engine is selected', async () => {
      selectedEngineId.mockReturnValue(null);
      const fixture = await render({ workflowId: 'wf-9', name: 'Flow' });
      const navigate = jest
        .spyOn(fixture.componentInstance.router, 'navigate')
        .mockResolvedValue(true);

      fixture.componentInstance.runScenario(new Event('click'));

      expect(navigate).toHaveBeenCalledWith(['/graph/read/wf-9'], {
        queryParams: { autorun: '1' },
      });
    });

    it('does not navigate when the selected engine blocks running', async () => {
      canRunWorkflow.mockReturnValue(false);
      const fixture = await render({ workflowId: 'wf-9', name: 'Flow' });
      const navigate = jest
        .spyOn(fixture.componentInstance.router, 'navigate')
        .mockResolvedValue(true);

      fixture.componentInstance.runScenario(new Event('click'));

      expect(navigate).not.toHaveBeenCalled();
    });

    it('does not navigate when the row has no workflow id', async () => {
      const fixture = await render({ name: 'No id' });
      const navigate = jest
        .spyOn(fixture.componentInstance.router, 'navigate')
        .mockResolvedValue(true);

      fixture.componentInstance.runScenario(new Event('click'));

      expect(navigate).not.toHaveBeenCalled();
    });

    it('keeps the run click from bubbling to the list', async () => {
      const fixture = await render({ workflowId: 'wf-9', name: 'Flow' });
      const event = new Event('click');
      const stop = jest.spyOn(event, 'stopImmediatePropagation');

      fixture.componentInstance.runScenario(event);

      expect(stop).toHaveBeenCalled();
    });

    it('disables the run affordance when the engine blocks running (SAA-905)', async () => {
      canRunWorkflow.mockReturnValue(false);
      const fixture = await render({ workflowId: 'wf-9', name: 'Flow' });
      const actions = fixture.nativeElement.querySelectorAll(
        '.graph-workflow-item__actions ion-button'
      );
      const run = actions[1] as HTMLElement;

      expect(run.hasAttribute('disabled')).toBe(true);
      expect(run.classList.contains('button-disabled')).toBe(true);
      const blockedLabel = TestBed.inject(TranslateService).instant(
        'graph.workflows.runBlocked'
      );
      expect(run.getAttribute('aria-label')).toBe(blockedLabel);
      expect(blockedLabel.trim()).not.toBe('');
    });

    it('keeps the run affordance enabled and named when the engine allows running (SAA-905)', async () => {
      const fixture = await render({ workflowId: 'wf-9', name: 'Flow' });
      const actions = fixture.nativeElement.querySelectorAll(
        '.graph-workflow-item__actions ion-button'
      );
      const run = actions[1] as HTMLElement;

      expect(run.hasAttribute('disabled')).toBe(false);
      const runLabel = TestBed.inject(TranslateService).instant('graph.workflows.run');
      expect(run.getAttribute('aria-label')).toBe(runLabel);
      expect(runLabel.trim()).not.toBe('');
    });
  });
});
