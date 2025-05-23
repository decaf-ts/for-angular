import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelRendererComponent } from './model-renderer.component';
import { ForAngularModel } from '../../../app/models/DemoModel';
import { Model } from '@decaf-ts/decorator-validation';
import { RenderingEngine } from '@decaf-ts/ui-decorators';
import { AngularDynamicOutput, AngularFieldDefinition, NgxRenderingEngine, NgxRenderingEngine2 } from '../../engine';

// Model.setBuilder(Model.fromModel);

describe('ModelRendererComponent', () => {
  let component: ModelRendererComponent<Model>;
  let fixture: ComponentFixture<ModelRendererComponent<Model>>;

  let engine: RenderingEngine<AngularFieldDefinition, AngularDynamicOutput> ;

  beforeAll(() => {
    engine = new NgxRenderingEngine2();
  });

  // Type 'NgxRenderingEngine2' is not assignable to type 'RenderingEngine<AngularFieldDefinition, FieldDefinition<AngularFieldDefinition>>'.
  // The types returned by 'render(...)' are incompatible between these types.
  //   Type 'AngularDynamicOutput' is missing the following properties from type 'FieldDefinition<AngularFieldDefinition>': tag, props
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModelRendererComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModelRendererComponent);
    component = fixture.componentInstance;
    component.model = new ForAngularModel();
    fixture.detectChanges();
  });

  it('should create and properly calculate the form', () => {
    expect(component).toBeTruthy();
    expect(component.output).toBeDefined();
  });
});
