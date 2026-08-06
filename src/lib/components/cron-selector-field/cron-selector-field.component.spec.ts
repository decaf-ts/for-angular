import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { I18nFakeLoader } from '../../i18n';
import { CronSelectorFieldComponent } from './cron-selector-field.component';

describe('CronSelectorFieldComponent', () => {
  let component: CronSelectorFieldComponent;
  let fixture: ComponentFixture<CronSelectorFieldComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CronSelectorFieldComponent,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: I18nFakeLoader,
          },
        }),
      ],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CronSelectorFieldComponent);
    component = fixture.componentInstance;
    component.operation = OperationKeys.CREATE;
    component.name = 'cronExpression';
    component.path = 'cronExpression';
    component.label = 'medication_schedule.cron_expression.label';
    component.type = 'text';
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should forward cron changes into the field value', () => {
    component.handleCronChange('0 8 * * *');

    expect(component.cronValue).toBe('0 8 * * *');
  });
});
