import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelRendererComponent } from './model-renderer.component';
import { ForAngularModel } from '../../../app/model/DemoModel';
import { Model } from '@decaf-ts/decorator-validation';
import { RenderingEngine } from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition, NgxRenderingEngine } from '../../engine';

Model.setBuilder(Model.fromModel);

describe('ModelRendererComponent', () => {
  let component: ModelRendererComponent<Model>;
  let fixture: ComponentFixture<ModelRendererComponent<Model>>;

  let engine: RenderingEngine<AngularFieldDefinition>;

  beforeAll(() => {
    engine = new NgxRenderingEngine();
  });

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
