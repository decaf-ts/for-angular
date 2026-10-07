/**
 * @module for-angular/app/pages/graph/graph-workflow-create.modal.spec
 * @summary SAA-68 D3 first-save create modal contract.
 * @description Proves the create modal renders the shared create form model with
 * the private namespace default and emits the collected values on confirm while
 * ignoring intermediate field-change events.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { I18nFakeLoader } from 'src/lib/i18n';
import type { IBaseCustomEvent } from 'src/lib/engine';
import {
  GraphWorkflowFormModel,
  GRAPH_WORKFLOW_PRIVATE_NAMESPACE,
} from 'src/app/models/GraphWorkflowFormModel';
import {
  GraphWorkflowCreateModalComponent,
  type GraphWorkflowCreateResult,
} from './graph-workflow-create.modal';

/** Mounts the modal and applies the given inputs. */
async function render(inputs: {
  open?: boolean;
  name?: string;
  defaultNamespace?: string;
} = {}): Promise<ComponentFixture<GraphWorkflowCreateModalComponent>> {
  await TestBed.configureTestingModule({
    imports: [
      GraphWorkflowCreateModalComponent,
      TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useClass: I18nFakeLoader },
      }),
    ],
    providers: [
      provideHttpClientTesting(),
      provideRouter([]),
      {
        provide: NavController,
        useValue: {
          navigateRoot: jest.fn(),
          navigateForward: jest.fn(),
          navigateBack: jest.fn(),
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(GraphWorkflowCreateModalComponent);
  fixture.componentRef.setInput('open', inputs.open ?? true);
  fixture.componentRef.setInput('name', inputs.name ?? '');
  if (inputs.defaultNamespace !== undefined) {
    fixture.componentRef.setInput('defaultNamespace', inputs.defaultNamespace);
  }
  return fixture;
}

describe('GraphWorkflowCreateModalComponent — first save (SAA-68 D3)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('builds the shared create form model with the draft name', async () => {
    const fixture = await render({ name: 'Text Pipeline' });

    const model = fixture.componentInstance.model();
    expect(model).toBeInstanceOf(GraphWorkflowFormModel);
    expect(model.name).toBe('Text Pipeline');
  });

  it('defaults the form namespace to the private user namespace', async () => {
    const fixture = await render({ name: 'Text Pipeline' });

    expect(fixture.componentInstance.model().namespace).toBe(
      GRAPH_WORKFLOW_PRIVATE_NAMESPACE
    );
  });

  it('applies an explicit namespace default', async () => {
    const fixture = await render({ name: 'Text Pipeline', defaultNamespace: 'company' });

    expect(fixture.componentInstance.model().namespace).toBe('company');
  });

  it('emits the collected values on a confirm submit', async () => {
    const fixture = await render({ name: 'Text Pipeline' });
    const emitted: GraphWorkflowCreateResult[] = [];
    fixture.componentInstance.submitted.subscribe((result) => emitted.push(result));

    fixture.componentInstance.onSubmit({
      role: 'confirm',
      name: 'submit',
      data: {
        name: '  Text Pipeline  ',
        description: '  A sufficiently long description  ',
        namespace: 'private',
      },
    } as unknown as IBaseCustomEvent);

    expect(emitted).toEqual([
      {
        name: 'Text Pipeline',
        description: 'A sufficiently long description',
        namespace: 'private',
        tags: undefined,
        category: undefined,
      },
    ]);
  });

  it('ignores intermediate field-change events', async () => {
    const fixture = await render({ name: 'Text Pipeline' });
    const emitted: GraphWorkflowCreateResult[] = [];
    fixture.componentInstance.submitted.subscribe((result) => emitted.push(result));

    fixture.componentInstance.onSubmit({
      role: 'change',
      name: 'name',
      data: { name: 'Text Pipeline' },
    } as unknown as IBaseCustomEvent);

    expect(emitted).toHaveLength(0);
  });

  it('emits cancelled when the modal is dismissed', async () => {
    const fixture = await render({ name: 'Text Pipeline' });
    let cancelled = 0;
    fixture.componentInstance.cancelled.subscribe(() => (cancelled += 1));

    fixture.componentInstance.onDismiss();

    expect(cancelled).toBe(1);
  });
});
