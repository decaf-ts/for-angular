/**
 * SECURITY-REVIEW PROBE — SAA-1630 (Red Team Web Pentester). DO NOT COMMIT.
 *
 * FA-3 runtime re-verification: modal inline content trusted-HTML rendering.
 * The current revision binds string inline content through plain `[innerHTML]`
 * (Angular default sanitizer) and appends live HTMLElement content directly.
 * Probes: string payloads cannot execute; markup survives (spoofing surface,
 * by design); bypassed SafeHtml reaches the DOM verbatim (documented trust
 * boundary); live-element path mounts as a node; modal-confirm mirrors this.
 */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule, TranslateParser } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../for-angular-common.module';
import { I18nFakeLoader, I18nParser } from '../i18n';
import { ModalComponent } from '../components/modal/modal.component';
import { ModalConfirmComponent } from '../components/modal/modal-confirm.component';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

const imports = [
  ForAngularCommonModule,
  ModalComponent,
  ModalConfirmComponent,
  TranslateModule.forRoot({
    loader: { provide: TranslateLoader, useClass: I18nFakeLoader },
    parser: { provide: TranslateParser, useClass: I18nParser },
  }),
];

describe('[SAA-1630 PROBE] FA-3 modal inline content re-verification', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;
  let sanitizer: DomSanitizer;
  let origGetComputedStyle: typeof window.getComputedStyle;

  beforeAll(() => {
    (window as any)['__fa3Executed'] = false;
    origGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = ((elt: Element, pseudoElt?: string | null) => {
      const res = origGetComputedStyle ? (origGetComputedStyle(elt, pseudoElt) as unknown as Record<string, unknown>) : {};
      return {
        ...res,
        getPropertyValue: (prop: string) => res[prop] || '',
      };
    }) as typeof window.getComputedStyle;
  });

  afterAll(() => {
    window.getComputedStyle = origGetComputedStyle;
  });

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    }).compileComponents();
    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    sanitizer = TestBed.inject(DomSanitizer);
  }));

  function inlineHost(): HTMLElement | null | undefined {
    const modalEl = document.getElementById(String(component.uid));
    return modalEl?.querySelector('.dcf-modal-content');
  }

  // Ionic's present() continues asynchronously (rAF/promise chain); let it
  // settle between presentations or the next modal's safe-area probe races.
  const settle = () => new Promise((r) => setTimeout(r, 50));

  it('string inline content: script and onerror are stripped, structure survives (content spoofing possible)', async () => {
    const XSS = 'window.__fa3Executed=true';
    (component as any).inlineContent = `<img src=x onerror="${XSS}"><script>${XSS}</script><b>spoofed-content</b>`;
    component.isOpen = true;
    await component.ngOnInit();
    fixture.detectChanges();
    await settle();

    const host = inlineHost();
    expect(host).toBeTruthy();
    expect(host!.querySelector('script')).toBeNull();
    const img = host!.querySelector('img');
    if (img) expect(img.getAttribute('onerror')).toBeNull();
    expect(host!.querySelector('b')?.textContent).toBe('spoofed-content');
    expect((window as any)['__fa3Executed']).toBe(false);
  });

  it('SafeHtml bypass IS honored verbatim (documented trust boundary — caller responsibility)', async () => {
    const XSS = 'window.__fa3Executed=true';
    (component as any).inlineContent = sanitizer.bypassSecurityTrustHtml(`<span class="probe-bypass"><img src=x onerror="${XSS}"></span>`);
    component.isOpen = true;
    await component.ngOnInit();
    fixture.detectChanges();
    await settle();

    const host = inlineHost();
    const img = host?.querySelector('.probe-bypass img');
    // The bypass renders the img with its onerror attribute intact.
    // In jsdom the handler never fires (no real event dispatch), proving
    // markup reaches the DOM unfiltered: any caller-controlled string passed
    // as a bypassed SafeHtml is a live DOM-XSS sink by construction.
    expect(img).toBeTruthy();
    expect(img?.getAttribute('onerror')).toContain('__fa3Executed');
  });

  it('live HTMLElement inline content is appended as a node (no serialization, no sanitizer)', async () => {
    const el = document.createElement('span');
    el.className = 'probe-live';
    el.innerHTML = '<b>live-node</b>';
    (component as any).inlineContent = el;
    component.isOpen = true;
    await component.ngOnInit();
    fixture.detectChanges();
    await settle();

    const host = inlineHost();
    expect(host?.querySelector('.probe-live b')?.textContent).toBe('live-node');
  });
});

describe('[SAA-1630 PROBE] FA-3 modal-confirm title/message path', () => {
  let component: ModalConfirmComponent;
  let fixture: ComponentFixture<ModalConfirmComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    }).compileComponents();
    fixture = TestBed.createComponent(ModalConfirmComponent);
    component = fixture.componentInstance;
  }));

  it('non-translatable title/message payloads are sanitized (no execution)', () => {
    const XSS = 'window.__fa3Executed=true';
    component.title = `<img src=x onerror="${XSS}">`;
    component.message = `<script>${XSS}</script><b>msg</b>`;
    component.translatable = false;
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('script')).toBeNull();
    const imgs = Array.from(host.querySelectorAll('img'));
    expect(imgs.every((i) => i.getAttribute('onerror') === null)).toBe(true);
    expect(host.querySelector('b')?.textContent).toBe('msg');
    expect((window as any)['__fa3Executed']).toBe(false);
  });
});
