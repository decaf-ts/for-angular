import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { CrudFormComponent } from './crud-form.component';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { FormGroup } from '@angular/forms';
import { I18nFakeLoader } from '../../i18n';

const imports = [
  ForAngularCommonModule,
  CrudFormComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader
    }
  })
];

describe('CrudFormComponent', () => {
  let component: CrudFormComponent;
  let fixture: ComponentFixture<CrudFormComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
    }).compileComponents();

    fixture = TestBed.createComponent(CrudFormComponent);
    component = fixture.componentInstance;
    component.operation = OperationKeys.CREATE;
    component.formGroup = new FormGroup({});
    fixture.detectChanges();
  }));

  it('should create', () => {
     // If ngOnInit returns a promise, await it
    if (component.ngOnInit instanceof Function)
      component.ngOnInit();

    // If ngAfterViewInit returns a promise, await it
    // if (component.ngAfterViewInit instanceof Function)
    //   component.ngAfterViewInit();

    // Force change detection after async operations
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
});
