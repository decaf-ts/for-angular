import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { TableComponent } from './table.component';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { I18nFakeLoader } from '../../i18n';
import { RouterModule } from '@angular/router';
import { NgxRouterService } from 'src/lib/services/NgxRouterService';
import { IonicModule } from '@ionic/angular';

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
