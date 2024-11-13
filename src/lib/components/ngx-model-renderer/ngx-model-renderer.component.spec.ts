import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxModelRendererComponent } from './ngx-model-renderer.component';
import { ForAngularModel } from '../../../app/model/DemoModel';
import { Model } from '@decaf-ts/decorator-validation';
import { RenderingEngine } from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition, NgxRenderingEngine } from '../../engine';

Model.setBuilder(Model.fromModel);

describe('NgxModelRendererComponent', () => {
  let component: NgxModelRendererComponent<Model>;
  let fixture: ComponentFixture<NgxModelRendererComponent<Model>>;

  let engine: RenderingEngine<AngularFieldDefinition>;

  beforeAll(() => {
    engine = new NgxRenderingEngine();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxModelRendererComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NgxModelRendererComponent);
    component = fixture.componentInstance;
    component.model = new ForAngularModel();
    fixture.detectChanges();
  });

  it('should create and properly calculate the form', () => {
    expect(component).toBeTruthy();
    expect(component.output).toBeDefined();
  });
});
