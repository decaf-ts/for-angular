/**
 * SECURITY-REVIEW PROBE — SAA-1630 (Red Team Web Pentester). DO NOT COMMIT.
 *
 * FA-1 runtime re-verification: empty-state search subtitle XSS via the
 * `safeHtml` bypass pipe. The fixed revision HTML-escapes `searchValue`
 * before interpolation into the translated subtitle. These probes attack the
 * full chain with payloads beyond the shipped regression tests and document
 * the sanitizer boundary of the plain `[innerHTML]` bindings (title/subtitle).
 */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule, TranslateParser, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ForAngularCommonModule } from '../for-angular-common.module';
import { I18nFakeLoader, I18nParser } from '../i18n';
import { ListComponent } from '../components/list/list.component';
import { EmptyStateComponent, escapeHtml } from '../components/empty-state/empty-state.component';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

describe('[SAA-1630 PROBE] FA-1 empty-state search XSS re-verification', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;
  let translateService: TranslateService;

  const XSS_FLAG = 'window.__fa1Executed';

  beforeEach(waitForAsync(() => {
    (window as any)['__fa1Executed'] = false;
    TestBed.configureTestingModule({
      imports: [
        ForAngularCommonModule,
        EmptyStateComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: I18nFakeLoader },
          parser: { provide: TranslateParser, useClass: I18nParser },
        }),
      ],
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    }).compileComponents();
    translateService = TestBed.inject(TranslateService);
    translateService.setDefaultLang('en');
    translateService.use('en');
    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
  }));

  it('unit: escapeHtml neutralizes every HTML-significant character', () => {
    const payload = `<img src=x onerror=${'window.__fa1Executed=true'}>"'&<script>alert(1)</script>`;
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('>');
    expect(escaped).not.toContain('"');
    expect(escaped).not.toContain("'");
    expect(escaped).toContain('&lt;img');
    expect(escaped).toContain('&amp;');
    const probe = document.createElement('div');
    probe.innerHTML = `<p>${escaped}</p>`;
    expect(probe.querySelector('img')).toBeNull();
    expect(probe.querySelector('script')).toBeNull();
    expect(probe.querySelector('p')?.textContent).toContain(payload);
  });

  it.each([
    ['img-onerror', `<img src=x onerror=${'window.__fa1Executed=true'}>`],
    ['svg-onload', `<svg onload=${'window.__fa1Executed=true'}></svg>`],
    ['attr-breakout', `"><img src=x onerror=${'window.__fa1Executed=true'}>`],
    ['quote-breakout', `'><img src=x onerror=${'window.__fa1Executed=true'}>`],
    ['script-tag', `<script>${'window.__fa1Executed=true'}</script>`],
    ['svg-use-script', `<svg><use href="data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+#x"/></svg>`],
  ])('payload %s does not execute through the safeHtml subtitle sink', async (_name, payload) => {
    await firstValueFrom(translateService.use('en'));
    translateService.setTranslation('en', { 'No results for {0}': 'No results for {0}' }, true);
    component.searchValue = payload;
    component.subtitle = 'No results for {0}';
    await component.ngOnInit();
    fixture.detectChanges();

    const p = fixture.debugElement.query(By.css('p'));
    expect(p).toBeTruthy();
    expect(p.nativeElement.querySelector('img')).toBeNull();
    expect(p.nativeElement.querySelector('script')).toBeNull();
    expect(p.nativeElement.querySelector('svg')).toBeNull();
    expect(p.nativeElement.querySelector('[onerror]')).toBeNull();
    expect((window as any)['__fa1Executed']).toBe(false);
    // escaped payload is displayed as literal text
    expect(p.nativeElement.textContent).toContain(payload);
  });

  it('placeholder-literal and $-sequence payloads stay inert and literal', async () => {
    await firstValueFrom(translateService.use('en'));
    translateService.setTranslation('en', { 'No results for {0}': 'No results for {0}' }, true);
    component.searchValue = '{0}';
    component.subtitle = 'No results for {0}';
    await component.ngOnInit();
    fixture.detectChanges();
    // single-pass interpolation: the literal {0} inside the value is not re-expanded
    expect(fixture.debugElement.query(By.css('p')).nativeElement.textContent).toContain('No results for {0}');

    const sf = document.createElement('div');
    // $-sequences are inert because sf() uses function-based replacement
    component.searchValue = "$&$'`${constructor}";
    await component.ngOnInit();
    fixture.detectChanges();
    const p2 = fixture.debugElement.query(By.css('p'));
    expect(p2.nativeElement.textContent).toContain("$&$'`${constructor}");
  });

  it('plain [innerHTML] title/subtitle bindings strip handlers but allow markup (content-spoofing boundary)', async () => {
    component.title = `Title <img src=x onerror=${'window.__fa1Executed=true'}>`;
    component.subtitle = `<b>bold</b><script>${'window.__fa1Executed=true'}</script>`;
    component.searchValue = '';
    await component.ngOnInit();
    fixture.detectChanges();

    const titleEl = fixture.debugElement.query(By.css('h4.dcf-ititle'));
    // Angular's default sanitizer KEEPS the <img> element but strips on* attributes:
    // markup injection (spoofing/UI redress) is possible; JS execution is not.
    const titleImg = titleEl.nativeElement.querySelector('img');
    if (titleImg) {
      expect(titleImg.getAttribute('onerror')).toBeNull();
    }
    expect(titleEl.nativeElement.textContent).toContain('Title');

    const p = fixture.debugElement.query(By.css('p'));
    expect(p.query(By.css('b'))).toBeTruthy(); // markup survives (spoofing surface)
    expect(p.nativeElement.querySelector('script')).toBeNull();
    expect((window as any)['__fa1Executed']).toBe(false);
  });
});

describe('[SAA-1630 PROBE] FA-1 list searchbarEvent seeding chain', () => {
  let component: ListComponent;
  let fixture: ComponentFixture<ListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ForAngularCommonModule,
        ListComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: I18nFakeLoader },
        }),
      ],
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    })
      .overrideComponent(ListComponent, {
        add: {
          template: `
          <ion-content>
            <ion-list [inset]="inset" [lines]="lines" #component>
              <ng-content></ng-content>
            </ion-list>
          </ion-content>
         `,
        },
      })
      .compileComponents();
    fixture = TestBed.createComponent(ListComponent);
    component = fixture.componentInstance;
  }));

  it('window:searchbarEvent CustomEvent seeds searchValue verbatim (attacker-controlled string reaches the sink)', async () => {
    const payload = `<img src=x onerror=${'window.__fa1Executed=true'}>`;
    fixture.detectChanges();
    component.customSource = true;
    component.data = [];
    window.dispatchEvent(new CustomEvent('searchbarEvent', { detail: { value: payload } }));
    await fixture.whenStable();
    expect(component.searchValue).toBe(payload);
  });
});
