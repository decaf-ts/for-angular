import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { CrudFormComponent } from './crud-form.component';
import { NgxRenderingEngine2 } from 'src/lib/engine';
import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { consoleWarn } from 'src/lib/helpers';

const imports = [
  ForAngularModule,
  CrudFormComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: TranslateFakeLoader
    }
  })
];

describe('FormReactiveComponent', () => {
  let component: CrudFormComponent;
  let fixture: ComponentFixture<CrudFormComponent>;
  let engine;

   beforeAll(() => {
     try {
       engine = new NgxRenderingEngine2();
       Model.setBuilder(Model.fromModel as ModelBuilderFunction);
     } catch (e: unknown) {
       consoleWarn(this, `Engine already loaded`);
     }
   });

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
    }).compileComponents();

    fixture = TestBed.createComponent(CrudFormComponent);
    component = fixture.componentInstance;
    component.operation = OperationKeys.CREATE;
    fixture.detectChanges();
  }));

  it('should create', () => {
     // If ngOnInit returns a promise, await it
    if (component.ngOnInit instanceof Function)
      component.ngOnInit();

    // If ngAfterViewInit returns a promise, await it
    if (component.ngAfterViewInit instanceof Function)
      component.ngAfterViewInit();

    // Force change detection after async operations
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
});
