import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { I18nFakeLoader } from '../../../lib/i18n';
import { CronSelectorPage } from './cron-selector.page';

describe('CronSelectorPage', () => {
  let component: CronSelectorPage;
  let fixture: ComponentFixture<CronSelectorPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CronSelectorPage,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: I18nFakeLoader,
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CronSelectorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
