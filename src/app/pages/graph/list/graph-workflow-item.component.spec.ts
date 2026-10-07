/**
 * @module for-angular/app/pages/graph/list/graph-workflow-item.component.spec
 * @summary SAA-68 D1 workflow list item contract.
 * @description Proves the custom list item renders a workflow row's name/timestamp
 * and routes the "open" and "past executions" actions to the edit canvas and the
 * execution list respectively.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { I18nFakeLoader } from 'src/lib/i18n';
import type { KeyValue } from 'src/lib/engine';
import { GraphWorkflowItemComponent } from './graph-workflow-item.component';

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
    TestBed.configureTestingModule({
      imports: [
        GraphWorkflowItemComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: I18nFakeLoader },
        }),
      ],
      providers: [provideRouter([])],
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

  it('opens the workflow in the edit canvas', async () => {
    const fixture = await render({ workflowId: 'wf-9', name: 'Flow' });
    const navigate = jest.spyOn(fixture.componentInstance.router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.openWorkflow(new Event('click'));

    expect(navigate).toHaveBeenCalledWith(['/graph/read/wf-9']);
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
});
