import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule, TranslateParser } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { I18nFakeLoader, I18nParser } from '../../i18n';
import { ModalComponent } from './modal.component';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

const imports = [
  ForAngularCommonModule,
  ModalComponent,
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

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;
  let sanitizer: DomSanitizer;
  let origGetComputedStyle: typeof window.getComputedStyle;

  beforeAll(() => {
    origGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
      const res = origGetComputedStyle ? (origGetComputedStyle(elt, pseudoElt) as any) : {};
      return {
        ...res,
        getPropertyValue: (prop: string) => res[prop] || '',
      } as any;
    };
  });

  afterAll(() => {
    window.getComputedStyle = origGetComputedStyle;
  });

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers: [
        provideRouter([]),
        { provide: NavController, useValue: navControllerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    sanitizer = TestBed.inject(DomSanitizer);
  }));



  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loading announces status', async () => {
    const translate = TestBed.inject(TranslateService);
    await firstValueFrom(translate.use('en'));
    translate.setTranslation('en', { component: { loading: 'Loading' } }, true);
    component.isOpen = true;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const status = document.body.querySelector('[role="status"]');
    expect(status).toBeTruthy();
    expect(status?.getAttribute('aria-busy')).toBe('true');
    expect(status?.textContent).toContain('Loading');
    expect(status?.querySelector('ion-spinner')).toBeTruthy();
  });

  const cases: Array<{ type: 'string' | 'HTMLElement' | 'SafeHtml'; position: 'top' | 'bottom' }> = [
    { type: 'string', position: 'top' },
    { type: 'string', position: 'bottom' },
    { type: 'HTMLElement', position: 'top' },
    { type: 'HTMLElement', position: 'bottom' },
    { type: 'SafeHtml', position: 'top' },
    { type: 'SafeHtml', position: 'bottom' },
  ];

  it.each(cases)(
    'baseline inline content types and positions: $type in $position position',
    async ({ type, position }) => {
      let content: string | HTMLElement | SafeHtml;
      let expectedText: string;

      if (type === 'string') {
        expectedText = 'hello string';
        content = `<span class="test-inline">${expectedText}</span>`;
      } else if (type === 'HTMLElement') {
        expectedText = 'hello element';
        const el = document.createElement('span');
        el.className = 'test-inline';
        el.textContent = expectedText;
        content = el;
      } else {
        expectedText = 'hello safe';
        content = sanitizer.bypassSecurityTrustHtml(`<span class="test-inline">${expectedText}</span>`);
      }

      (component as any).inlineContent = content;
      component.inlineContentPosition = position;
      component.isOpen = true;
      await component.ngOnInit();
      fixture.detectChanges();

      const modalEl = document.getElementById(String(component.uid));
      expect(modalEl).toBeTruthy();
      const modalContent = modalEl?.querySelector('.dcf-modal-content');
      expect(modalContent).toBeTruthy();
      const inlineEl = modalContent?.querySelector('.test-inline');
      expect(inlineEl).toBeTruthy();
      expect(inlineEl?.textContent).toBe(expectedText);
    }
  );

  it('regression inline content xss', async () => {
    component.inlineContent = '<img src=x onerror=alert(1)><b>ok</b>';
    component.isOpen = true;
    await component.ngOnInit();
    fixture.detectChanges();

    const modalEl = document.getElementById(String(component.uid));
    expect(modalEl).toBeTruthy();
    const contentEl = modalEl?.querySelector('.dcf-modal-content');
    expect(contentEl).toBeTruthy();
    expect(contentEl?.innerHTML).not.toContain('onerror');
    const b = contentEl?.querySelector('b');
    expect(b).toBeTruthy();
    expect(b?.textContent).toBe('ok');
  });

  it('string inline content stays a string', () => {
    const rawString = '<p>plain content</p>';
    component.inlineContent = rawString;
    component.parseInlineContent();
    expect(typeof component.inlineContent).toBe('string');
    expect(component.inlineContent).toBe(rawString);
  });

  it('html element content is appended live, keeping svg intact', async () => {
    const div = document.createElement('div');
    div.innerHTML = '<svg viewBox="0 0 1 1"><circle r="1"></circle></svg>';

    (component as any).inlineContent = div;
    component.isOpen = true;
    await component.ngOnInit();
    fixture.detectChanges();

    // live elements stay elements: stringifying + [innerHTML] would run them
    // through the sanitizer, which strips SVG and empties the modal body
    expect(component.inlineContentIsElement).toBe(true);

    const modalEl = document.getElementById(String(component.uid));
    const contentEl = modalEl?.querySelector('.dcf-modal-content');
    expect(contentEl).toBeTruthy();
    expect(contentEl?.querySelector('svg')).toBeTruthy();
    expect(contentEl?.contains(div)).toBe(true);
  });

  it('safe html passthrough', async () => {
    const trustedMarkup = '<svg class="trusted-svg"><circle r="5"></circle></svg>';
    component.inlineContent = sanitizer.bypassSecurityTrustHtml(trustedMarkup);
    component.isOpen = true;
    await component.ngOnInit();
    fixture.detectChanges();

    const modalEl = document.getElementById(String(component.uid));
    const contentEl = modalEl?.querySelector('.dcf-modal-content');
    expect(contentEl).toBeTruthy();
    const svgEl = contentEl?.querySelector('svg');
    expect(svgEl).toBeTruthy();
    expect(svgEl?.classList.contains('trusted-svg')).toBe(true);
  });
});
