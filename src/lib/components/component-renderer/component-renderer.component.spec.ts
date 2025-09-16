import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ComponentRendererComponent } from './component-renderer.component';
import { NgxRenderingEngine } from '../../engine';
import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { ListItemComponent } from '../list-item/list-item.component';

const imports = [
  ForAngularCommonModule,
  ComponentRendererComponent,
  ListItemComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: TranslateFakeLoader
    }
  })
];

describe.skip('ComponentRendererComponent', () => {
  let component: ComponentRendererComponent;
  let fixture: ComponentFixture<ComponentRendererComponent>;
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

    fixture = TestBed.createComponent(ComponentRendererComponent);
    component = fixture.componentInstance;
    component.tag = 'ngx-decaf-list-item';
    component.globals = {
      title: 'This is a title',
      description: 'This is a description'
    };
    fixture.detectChanges();
    component.ngOnInit();

  }));

  it('should create', () => {
    component.ngOnInit();

    expect(component).toBeTruthy();
  });
});
