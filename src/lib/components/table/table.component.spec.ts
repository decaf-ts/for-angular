import { RouterModule } from '@angular/router';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { TableComponent } from './table.component';
import { I18nFakeLoader } from '../../i18n';
import { NgxRouterService } from '../../services/NgxRouterService';

import { Observable, of } from 'rxjs';
import { OperationKeys } from '@decaf-ts/db-decorators';
import en from '../../i18n/data/en.json';

class RealEnLoader implements TranslateLoader {
  getTranslation(): Observable<any> {
    return of(en);
  }
}

const imports = [
  ForAngularCommonModule,
  IonicModule.forRoot(),
  RouterModule.forRoot([]),
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: RealEnLoader,
    },
  }),
];

const providers = [NgxRouterService, TranslateService];
describe('TableComponent', () => {
  let component: TableComponent;
  let fixture: ComponentFixture<TableComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('en');
    translate.use('en');

    fixture = TestBed.createComponent(TableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('baseline row actions', () => {
    (component as any).initialized = true;
    component.data = [{ id: '1' }];
    component.items = [
      {
        '0': { prop: 'name', value: 'Test', index: 0 },
        uid: { value: '1' },
      },
    ];
    component.headers = ['name'];
    component.cols = ['name', 'actions'];
    component.allowOperations = true;

    // Test READ operation
    component.operations = [OperationKeys.READ];
    fixture.detectChanges();
    let actionIcons = fixture.nativeElement.querySelectorAll('.dcf-col-actions ngx-decaf-icon');
    expect(actionIcons.length).toBe(1);
    expect(actionIcons[0].getAttribute('name')).toBe('ti-eye');

    // Test UPDATE operation
    component.operations = [OperationKeys.UPDATE];
    fixture.detectChanges();
    actionIcons = fixture.nativeElement.querySelectorAll('.dcf-col-actions ngx-decaf-icon');
    expect(actionIcons.length).toBe(1);
    expect(actionIcons[0].getAttribute('name')).toBe('ti-edit');

    // Test DELETE operation
    component.operations = [OperationKeys.DELETE];
    fixture.detectChanges();
    actionIcons = fixture.nativeElement.querySelectorAll('.dcf-col-actions ngx-decaf-icon');
    expect(actionIcons.length).toBe(1);
    expect(actionIcons[0].getAttribute('name')).toBe('ti-trash');
  });

  it('table actions have accessible names', () => {
    (component as any).initialized = true;
    component.data = [{ id: '1' }];
    component.items = [
      {
        '0': { prop: 'name', value: 'Test', index: 0 },
        uid: { value: '1' },
      },
    ];
    component.headers = ['name'];
    component.cols = ['name', 'actions'];
    component.allowOperations = true;

    // READ operation
    component.operations = [OperationKeys.READ];
    fixture.detectChanges();
    const readBtn = fixture.nativeElement.querySelector('.dcf-col-actions ion-button');
    expect(readBtn).not.toBeNull();
    const readLabel = readBtn.getAttribute('aria-label');
    expect(readLabel).toBe('Read');

    // UPDATE and DELETE operations
    component.operations = [OperationKeys.UPDATE, OperationKeys.DELETE];
    fixture.detectChanges();
    const actionBtns = Array.from(
      fixture.nativeElement.querySelectorAll('.dcf-col-actions ion-button')
    ) as HTMLElement[];
    expect(actionBtns.length).toBe(2);
    expect(actionBtns[0].getAttribute('aria-label')).toBe('Update');
    expect(actionBtns[1].getAttribute('aria-label')).toBe('Delete');
  });

  it('row action icons still dispatch handleRedirect on click', () => {
    (component as any).initialized = true;
    component.data = [{ id: '1' }];
    component.items = [
      {
        '0': { prop: 'name', value: 'Test', index: 0 },
        uid: { value: '1' },
      },
    ];
    component.headers = ['name'];
    component.cols = ['name', 'actions'];
    component.allowOperations = true;
    component.operations = [OperationKeys.READ];
    const redirect = jest.spyOn(component, 'handleRedirect').mockResolvedValue(undefined);
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector(
      '.dcf-col-actions ngx-decaf-icon'
    ) as HTMLElement;
    expect(icon).not.toBeNull();
    icon.click();
    expect(redirect).toHaveBeenCalledTimes(1);
  });

  it('regression interactive cell focusable', () => {
    (component as any).initialized = true;
    component.data = [{ id: '1' }];
    component.items = [
      {
        '0': { prop: 'name', value: 'Test', index: 0, handler: { handle: jest.fn() } },
        uid: { value: '1' },
      },
    ];
    component.headers = ['name'];
    const action = jest.spyOn(component, 'handleAction').mockResolvedValue(undefined);
    fixture.detectChanges();

    const button: HTMLButtonElement | null = fixture.nativeElement.querySelector('td button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain('Test');
    button?.click();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('interactive cell keyboard', () => {
    (component as any).initialized = true;
    component.data = [{ id: '1' }];
    component.items = [
      {
        '0': { prop: 'name', value: 'Test', index: 0, handler: { handle: jest.fn() } },
        uid: { value: '1' },
      },
    ];
    component.headers = ['name'];
    const action = jest.spyOn(component, 'handleAction').mockResolvedValue(undefined);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('td button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBeNull();
    expect(button.textContent).toContain('Test');

    for (const key of ['Enter', ' ']) {
      action.mockClear();
      button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      // JSDOM omits native button key activation; the click below models the browser default.
      button.click();
      expect(action).toHaveBeenCalledTimes(1);
    }
  });

  it('regression plain cell click still reaches handleAction (READ navigation)', () => {
    (component as any).initialized = true;
    component.data = [{ id: '1' }];
    component.items = [
      {
        '0': { prop: 'name', value: 'Test', index: 0 },
        uid: { value: '1' },
      },
    ];
    component.headers = ['name'];
    const action = jest.spyOn(component, 'handleAction').mockResolvedValue(undefined);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('td') as HTMLElement).click();
    expect(action).toHaveBeenCalledTimes(1);
    expect(action.mock.calls[0][1]).toBeUndefined();
    expect(action.mock.calls[0][3]).toBe(OperationKeys.READ);
  });

  it('table is named by the model name (aria-label), without visible text', () => {
    (component as any).initialized = true;
    component.modelName = 'CategoryModel';
    component.data = [{ id: '1' }];
    component.items = [{ '0': { prop: 'name', value: 'Test', index: 0 }, uid: { value: '1' } }];
    component.headers = ['name'];
    fixture.detectChanges();
    const table = fixture.nativeElement.querySelector('table') as HTMLElement;
    expect(table.getAttribute('aria-label')).toBe('CategoryModel');
    expect(table.querySelector('caption')).toBeNull();
  });

  it('READ trigger on the column is keyboard-operable when the READ icon is hidden', () => {
    (component as any).initialized = true;
    component.data = [{ id: '1' }];
    component.operations = [OperationKeys.READ, OperationKeys.UPDATE];
    component.items = [{ '0': { prop: 'name', value: 'Test', index: 0 }, uid: { value: '1' } }];
    component.headers = ['name'];
    const action = jest.spyOn(component, 'handleAction').mockResolvedValue(undefined);
    fixture.detectChanges();
    const td = fixture.nativeElement.querySelector('td') as HTMLElement;
    expect(td.getAttribute('tabindex')).toBe('0');
    for (const key of ['Enter', ' ']) {
      action.mockClear();
      td.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      expect(action).toHaveBeenCalledTimes(1);
      expect(action.mock.calls[0][3]).toBe(OperationKeys.READ);
    }
  });

  it('READ-only (icon visible) or handler cell: td is not a tab stop', () => {
    (component as any).initialized = true;
    component.data = [{ id: '1' }];
    component.operations = [OperationKeys.READ];
    component.items = [{ '0': { prop: 'name', value: 'Test', index: 0 }, uid: { value: '1' } }];
    component.headers = ['name'];
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('td') as HTMLElement).getAttribute('tabindex')).toBeNull();
  });
});
