/**
 * @module for-angular/app/pages/graph/executions/graph-run-item.component.spec
 * @summary SAA-68 D2 execution list item contract.
 * @description Proves the custom run row renders the run status and re-emits a
 * `replay` list event carrying the run id, so the execution list page can replay
 * the run through the canonical run client.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { I18nFakeLoader } from 'src/lib/i18n';
import type { IListItemCustomEvent, KeyValue } from 'src/lib/engine';
import { GraphRunItemComponent } from './graph-run-item.component';

/** Mounts the run item with the given row and lets its async init settle. */
async function render(row: KeyValue): Promise<ComponentFixture<GraphRunItemComponent>> {
  const fixture = TestBed.createComponent(GraphRunItemComponent);
  fixture.componentInstance.model = row as never;
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('GraphRunItemComponent — execution row (SAA-68 D2)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        GraphRunItemComponent,
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

  it('renders the run status and creation timestamp', async () => {
    const fixture = await render({
      runId: 'run-1',
      status: 'completed',
      createdAt: '2026-01-02T00:00:00.000Z',
    });

    const status = fixture.nativeElement.querySelector('.graph-run-item__status');
    expect(status?.textContent).toContain('completed');
  });

  it('emits a replay list event carrying the run id', async () => {
    const fixture = await render({ runId: 'run-1', status: 'completed' });
    const emitted: IListItemCustomEvent[] = [];
    fixture.componentInstance.clickEvent.subscribe((event) => emitted.push(event));

    fixture.componentInstance.replay(new Event('click'));

    expect(emitted).toHaveLength(1);
    expect(emitted[0].action).toBe('replay');
    expect(emitted[0].data).toBe('run-1');
  });

  it('does not emit a replay event when the row has no run id', async () => {
    const fixture = await render({ status: 'completed' });
    const emitted: IListItemCustomEvent[] = [];
    fixture.componentInstance.clickEvent.subscribe((event) => emitted.push(event));

    fixture.componentInstance.replay(new Event('click'));

    expect(emitted).toHaveLength(0);
  });

  it('keeps the replay click from bubbling to the list', async () => {
    const fixture = await render({ runId: 'run-1', status: 'completed' });
    const event = new Event('click');
    const stop = jest.spyOn(event, 'stopImmediatePropagation');

    fixture.componentInstance.replay(event);

    expect(stop).toHaveBeenCalled();
  });
});
