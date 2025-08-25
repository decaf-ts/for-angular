import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelRendererComponent } from './model-renderer.component';
import { ForAngularModel } from '../../../app/models/DemoModel';
import { NgxRenderingEngine2 } from '../../engine';
import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ForAngularModule } from '../../for-angular.module';
import { CrudFormComponent } from '../../components/crud-form/crud-form.component';

const imports = [
  ForAngularModule,
  ModelRendererComponent,
  CrudFormComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: TranslateFakeLoader
    }
  })
];

describe('ModelRendererComponent', () => {
  let component: ModelRendererComponent<Model>;
  let fixture: ComponentFixture<ModelRendererComponent<Model>>;

   let engine;

  beforeAll(() => {
    try {
      engine = new NgxRenderingEngine2();
      Model.setBuilder(Model.fromModel as ModelBuilderFunction);
    } catch (e: unknown) {
      console.warn(`Engine already loaded`);
    }
  });


  // Type 'NgxRenderingEngine2' is not assignable to type 'RenderingEngine<AngularFieldDefinition, FieldDefinition<AngularFieldDefinition>>'.
  // The types returned by 'render(...)' are incompatible between these types.
  //   Type 'AngularDynamicOutput' is missing the following properties from type 'FieldDefinition<AngularFieldDefinition>': tag, props
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports,
    }).compileComponents();

    fixture = TestBed.createComponent(ModelRendererComponent);
    component = fixture.componentInstance;
    component.model = new ForAngularModel();
    fixture.detectChanges();
  });

  xit('should create and properly calculate the form', () => {
    expect(component).toBeTruthy();
    expect(component.output).toBeDefined();
  });
});
