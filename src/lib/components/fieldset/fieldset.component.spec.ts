import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { FieldsetComponent } from './fieldset.component';
import { NgxRenderingEngine2 } from 'src/lib/engine';
import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

const imports = [
  ForAngularModule,
  FieldsetComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: TranslateFakeLoader,
    },
  }),
];

xdescribe('FieldsetComponent', () => {
  let component: FieldsetComponent;
  let fixture: ComponentFixture<FieldsetComponent>;
  let engine;

  beforeAll(() => {
    try {
      engine = new NgxRenderingEngine2();
      Model.setBuilder(Model.fromModel as ModelBuilderFunction);
    } catch (e: unknown) {
      console.warn(`Engine already loaded`);
    }
  });

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
    }).compileComponents();

    fixture = TestBed.createComponent(FieldsetComponent);
    component = fixture.componentInstance;
    // component.operation = OperationKeys.CREATE;
    fixture.detectChanges();
  }));

  it('should create', () => {
    // If ngOnInit returns a promise, await it
    // if (component?.ngOnInit instanceof Function)
    //   component.ngOnInit();

    // If ngAfterViewInit returns a promise, await it
    // if ((component as any)["ngAfterViewInit"] instanceof Function)
    //   component.ngAfterViewInit();

    // Force change detection after async operations
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
});
