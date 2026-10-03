import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FormArray, FormGroup } from '@angular/forms';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule, TranslateParser, TranslateService } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { I18nFakeLoader, I18nParser } from '../../i18n';
import { firstValueFrom } from 'rxjs';
import { SteppedFormComponent } from './stepped-form.component';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

describe('SteppedFormComponent step indicator', () => {
  let component: SteppedFormComponent;
  let fixture: ComponentFixture<SteppedFormComponent>;
  let translate: TranslateService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ForAngularCommonModule,
        SteppedFormComponent,
        TranslateModule.forRoot({
          defaultLanguage: 'en',
          loader: { provide: TranslateLoader, useClass: I18nFakeLoader },
          parser: { provide: TranslateParser, useClass: I18nParser },
        }),
      ],
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    }).compileComponents();
    translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('en');
    translate.use('en');
    fixture = TestBed.createComponent(SteppedFormComponent);
    component = fixture.componentInstance;
    component.children = [];
    component.formGroup = new FormArray([new FormGroup({}), new FormGroup({}), new FormGroup({})]);
    component.pages = [
      { title: 'First', description: '' },
      { title: 'Second', description: '' },
      { title: 'Third', description: '' },
    ];
    component.startPage = 2;
  }));

  async function render(): Promise<void> {
    await firstValueFrom(translate.use('en'));
    translate.setTranslation('en', { component: { stepped_form: { step_of: 'Step {current} of {total}' } } }, true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('regression step aria current', async () => {
    await render();
    expect(fixture.nativeElement.querySelector('[aria-current="step"]')).toBeTruthy();
  });

  it('step indicator semantics', async () => {
    await render();
    const indicator = fixture.nativeElement.querySelector('.dcf-page-steps');
    expect(indicator.getAttribute('aria-label')).toBe('Step 2 of 3');
    const currentStep = fixture.nativeElement.querySelector('.dcf-step[aria-current="step"]');
    expect(currentStep.textContent.trim()).toBe('2');
  });
});
