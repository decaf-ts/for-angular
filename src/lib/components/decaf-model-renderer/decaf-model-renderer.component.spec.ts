import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DecafModelRendererComponent } from './decaf-model-renderer.component';
import { ForAngularModel } from '../../../app/model/DemoModel';
import { Model } from '@decaf-ts/decorator-validation';
import { RenderingEngine } from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition, NgxRenderingEngine } from '../../engine';

Model.setBuilder(Model.fromModel);

describe('NgxModelRendererComponent', () => {
  let component: DecafModelRendererComponent<Model>;
  let fixture: ComponentFixture<DecafModelRendererComponent<Model>>;

  let engine: RenderingEngine<AngularFieldDefinition>;

  beforeAll(() => {
    engine = new NgxRenderingEngine();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DecafModelRendererComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DecafModelRendererComponent);
    component = fixture.componentInstance;
    component.model = new ForAngularModel();
    fixture.detectChanges();
  });

  it('should create and properly calculate the form', () => {
    expect(component).toBeTruthy();
    expect(component.output).toBeDefined();
  });
});
