import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { FieldsetComponent } from './fieldset.component';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { I18nFakeLoader } from '../../i18n';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

const imports = [
  ForAngularCommonModule,
  FieldsetComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader,
    },
  }),
];

describe('FieldsetComponent', () => {
  let component: FieldsetComponent;
  let fixture: ComponentFixture<FieldsetComponent>;
  let translate: TranslateService;
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers: [
        provideRouter([]),
        { provide: NavController, useValue: navControllerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FieldsetComponent);
    component = fixture.componentInstance;
    translate = TestBed.inject(TranslateService);
    // component.operation = OperationKeys.CREATE;
    fixture.detectChanges();
  }));

  it('should create', () => {
    // If ngOnInit returns a promise, await it
    // if (component?.ngOnInit instanceof Function)
    //   component.ngOnInit();

    // If ngAfterViewInit returns a promise, await it
    // if ((component as any)["ngAfterViewInit"] instanceof Function)
    //   component.ngAfterViewInit();

    // Force change detection after async operations
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loading announces status', async () => {
    await firstValueFrom(translate.use('en'));
    translate.setTranslation('en', { component: { loading: 'Loading' } }, true);
    (component as any).operation = 'read';
    component.multiple = true;
    component.refreshing = true;
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('[role="status"]');
    expect(status).toBeTruthy();
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.textContent).toContain('Loading');
    expect(status.querySelector('ion-spinner')).toBeTruthy();
  });
});
