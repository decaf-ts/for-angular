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
});
