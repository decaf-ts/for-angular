import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NavController } from '@ionic/angular/standalone';
import { ModelRendererComponent } from './model-renderer.component';
import { ForAngularModel } from '../../../app/models/DemoModel';
import { Model } from '@decaf-ts/decorator-validation';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { CrudFormComponent } from '../../components/crud-form/crud-form.component';
import { I18nFakeLoader } from '../../i18n';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

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

const providers = [
  provideHttpClientTesting(),
  provideRouter([]),
  { provide: NavController, useValue: navControllerMock },
];

describe('ModelRendererComponent', () => {
  let component: ModelRendererComponent<Model>;
  let fixture: ComponentFixture<ModelRendererComponent<Model>>;

  // Type 'NgxRenderingEngine' is not assignable to type 'RenderingEngine<AngularFieldDefinition, FieldDefinition<AngularFieldDefinition>>'.
  // The types returned by 'render(...)' are incompatible between these types.
  //   Type 'AngularDynamicOutput' is missing the following properties from type 'FieldDefinition<AngularFieldDefinition>': tag, props
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports, providers
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
