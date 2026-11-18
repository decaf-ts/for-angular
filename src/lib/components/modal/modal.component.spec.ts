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

  const cases: Array<{ type: 'string' | 'SafeHtml'; position: 'top' | 'bottom' }> = [
    { type: 'string', position: 'top' },
    { type: 'string', position: 'bottom' },
    { type: 'SafeHtml', position: 'top' },
    { type: 'SafeHtml', position: 'bottom' },
  ];

  it.each(cases)(
    'baseline inline content types and positions: $type in $position position',
    async ({ type, position }) => {
      let content: string | SafeHtml;
      let expectedText: string;

      if (type === 'string') {
        expectedText = 'hello string';
        content = `<span class="test-inline">${expectedText}</span>`;
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

  it('html element content is rebuilt images-only: svg renders as inert img, live node is not attached', async () => {
    const div = document.createElement('div');
    div.innerHTML =
      '<svg width="280" height="140" viewBox="0 0 280 140"><rect width="280" height="140" fill="#fff"></rect></svg>' +
      '<p onclick="void(0)">not an image</p>';

    (component as any).inlineContent = div;
    component.isOpen = true;
    await component.ngOnInit();
    fixture.detectChanges();
    fixture.detectChanges();

    expect(component.inlineContentIsElement).toBe(true);

    const modalEl = document.getElementById(String(component.uid));
    const contentEl = modalEl?.querySelector('.dcf-modal-content');
    expect(contentEl).toBeTruthy();
    // SVG survives (vector quality) but as a rebuilt inert img, not a live node
    const img = contentEl?.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(img?.width).toBe(280);
    expect(img?.height).toBe(140);
    // the live wrapper is never attached and non-image content fails closed
    expect(contentEl?.contains(div)).toBe(false);
    expect(contentEl?.querySelector('p')).toBeNull();
    expect(contentEl?.querySelector('svg')).toBeNull();
    // idempotent across change detection: exactly one rebuilt image
    expect(contentEl?.querySelectorAll('img').length).toBe(1);
  });

  it('img element content is rebuilt without its handlers', async () => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML =
      '<img id="hostile" src="https://example.com/photo.png" alt="photo" onerror="void(0)" onclick="void(0)" style="position: fixed; inset: 0">';

    (component as any).inlineContent = wrapper;
    component.isOpen = true;
    await component.ngOnInit();
    fixture.detectChanges();

    const modalEl = document.getElementById(String(component.uid));
    const contentEl = modalEl?.querySelector('.dcf-modal-content');
    const img = contentEl?.querySelector('img');
    expect(img).toBeTruthy();
    // src and alt carry over; handlers and styles from the source node never do
    expect(img?.getAttribute('src')).toBe('https://example.com/photo.png');
    expect(img?.getAttribute('alt')).toBe('photo');
    expect(img?.hasAttribute('onerror')).toBe(false);
    expect(img?.hasAttribute('onclick')).toBe(false);
    expect(img?.getAttribute('style')).toBeNull();
    expect(contentEl?.querySelector('#hostile')).toBeNull();
  });

  it('canvas element content that cannot rasterize fails closed (no live canvas attached)', async () => {
    // jsdom has no canvas backend: toDataURL throws → the node is skipped, never attached live.
    // In a real browser the same code path yields a data:image/png rebuilt img.
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;

    (component as any).inlineContent = canvas;
    component.isOpen = true;
    await component.ngOnInit();
    fixture.detectChanges();

    const modalEl = document.getElementById(String(component.uid));
    const contentEl = modalEl?.querySelector('.dcf-modal-content');
    expect(contentEl?.querySelector('canvas')).toBeNull();
  });

  it('non-image element content fails closed (nothing attached)', async () => {
    const span = document.createElement('span');
    span.className = 'text-content';
    span.textContent = 'just text';

    (component as any).inlineContent = span;
    component.isOpen = true;
    await component.ngOnInit();
    fixture.detectChanges();

    const modalEl = document.getElementById(String(component.uid));
    const contentEl = modalEl?.querySelector('.dcf-modal-content');
    expect(contentEl?.querySelector('.text-content')).toBeNull();
    expect(contentEl?.querySelectorAll('img').length).toBe(0);
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
