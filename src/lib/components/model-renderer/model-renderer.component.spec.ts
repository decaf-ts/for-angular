import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelRendererComponent } from './model-renderer.component';
import { ForAngularModel } from '../../../app/models/DemoModel';
import { Model } from '@decaf-ts/decorator-validation';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { CrudFormComponent } from '../../components/crud-form/crud-form.component';
import { I18nFakeLoader } from '../../i18n';

const imports = [
  ForAngularCommonModule,
  ModelRendererComponent,
  CrudFormComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader
    }
  })
];

describe('ModelRendererComponent', () => {
  let component: ModelRendererComponent<Model>;
  let fixture: ComponentFixture<ModelRendererComponent<Model>>;

  // Type 'NgxRenderingEngine' is not assignable to type 'RenderingEngine<AngularFieldDefinition, FieldDefinition<AngularFieldDefinition>>'.
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
