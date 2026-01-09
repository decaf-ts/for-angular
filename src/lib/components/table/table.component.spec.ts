import { RouterModule } from '@angular/router';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { TableComponent } from './table.component';
import { I18nFakeLoader } from '../../i18n';
import { NgxRouterService } from '../../services/NgxRouterService';

const imports = [
  ForAngularCommonModule,
  IonicModule.forRoot(),
  RouterModule.forRoot([]),
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader
    }
  })
];

const providers = [NgxRouterService, TranslateService];
describe('TableComponent', () => {
  let component: TableComponent;
  let fixture: ComponentFixture<TableComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers
    }).compileComponents();

    fixture = TestBed.createComponent(TableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {

    expect(component).toBeTruthy();
  });
});
