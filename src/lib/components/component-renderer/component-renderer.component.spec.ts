import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ComponentRendererComponent } from './component-renderer.component';
import { NgxRenderingEngine } from '../../engine';
import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { ListItemComponent } from '../list-item/list-item.component';
import { I18nFakeLoader } from '../../i18n';

const imports = [
  ForAngularCommonModule,
  ComponentRendererComponent,
  ListItemComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader
    }
  })
];

describe.skip('ComponentRendererComponent', () => {
  let component: ComponentRendererComponent;
  let fixture: ComponentFixture<ComponentRendererComponent>;

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
