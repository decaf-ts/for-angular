import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { SearchbarComponent } from './searchbar.component';
import { NgxRenderingEngine } from '../../engine';
import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { I18nFakeLoader } from '../../i18n';

const imports = [
  ForAngularCommonModule,
  SearchbarComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader
    }
  })
];
describe('SearchbarComponent', () => {
  let component: SearchbarComponent;
  let fixture: ComponentFixture<SearchbarComponent>;
  let engine;

  beforeAll(() => {
    try {
      engine = new NgxRenderingEngine();
      Model.setBuilder(Model.fromModel as ModelBuilderFunction);
    } catch (e: unknown) {
      console.warn(`Engine already loaded`);
    }
  });
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
    }).compileComponents();

    fixture = TestBed.createComponent(SearchbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
