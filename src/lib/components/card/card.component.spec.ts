import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule, TranslateParser } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { I18nFakeLoader, I18nParser } from '../../i18n';
import { CardComponent } from './card.component';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

const imports = [
  ForAngularCommonModule,
  CardComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader,
    },
    parser: {
      provide: TranslateParser,
      useClass: I18nParser,
    },
  }),
];

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers: [
        provideRouter([]),
        { provide: NavController, useValue: navControllerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('baseline inline content sanitized', () => {
    component.inlineContent = '<b>bold text</b><script>window.__xss = true;</script>';
    fixture.detectChanges();

    const contentEl = fixture.debugElement.query(By.css('ion-card-content'));
    expect(contentEl).toBeTruthy();

    const bEl = contentEl.query(By.css('b'));
    expect(bEl).toBeTruthy();
    expect(bEl.nativeElement.textContent).toBe('bold text');

    const scriptEl = contentEl.query(By.css('script'));
    expect(scriptEl).toBeFalsy();
    expect(contentEl.nativeElement.innerHTML).not.toContain('<script>');
  });
});
