import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { PaginationComponent } from './pagination.component';
import { NgxRenderingEngine } from '../../engine';
import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { IonIcon } from '@ionic/angular/standalone';
import { I18nFakeLoader } from '../../i18n';


const imports = [
  ForAngularCommonModule,
  PaginationComponent,
  IonIcon,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader
    }
  })
];

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

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

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
