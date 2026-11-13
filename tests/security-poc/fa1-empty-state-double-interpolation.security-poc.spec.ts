/**
 * [SECURITY-POC] — CF-1 / FA-1 bypass attempt: empty-state search-subtitle XSS via
 * double interpolation (independent validation, Exploit Validator, SAA-1632).
 *
 * Finding:  CF-1 (SAA-1629 white-box candidate, Medium) — "escapeHtml defeated by
 *           double interpolation in the search-results empty state".
 * Conflict: SAA-1630 (browser-facing review) concluded FA-1 "REMEDIATED, not
 *           exploitable". These POCs resolve the conflict independently: the
 *           shipped regression specs and the SAA-1630 probes only exercised the
 *           KEY-shape subtitle (`subtitle = 'component.list.search.subtitle'`),
 *           while the real host wiring (list.component.html:169-173,
 *           table.component.html:238-244) binds the ALREADY-INTERPOLATED
 *           sentence produced by `'component.list.search.subtitle' | translate:
 *           { '0': parseSearchValue() }`.
 *
 * Affected files (pinned revision for-angular abb26f50, v0.12.5):
 *   - src/lib/components/list/list.component.html:169-173 (searching branch binding)
 *   - src/lib/components/table/table.component.html:238-244 (same binding)
 *   - src/lib/components/empty-state/empty-state.component.ts:313-320,388-392
 *     (ngOnInit -> getSearchSubtitle(this.subtitle): escapes this.searchValue
 *     and re-translates the already-interpolated sentence; ngx-translate v17
 *     returns a missing key VERBATIM with interpolation params discarded, so
 *     the escaped value is computed and thrown away)
 *   - src/lib/i18n/data/en.json:171 (real production template embeds {0} inside
 *     real markup: <ion-text ...>{0}</ion-text>)
 *   - src/lib/pipes/safe-html.pipe.ts:50-52 (trusted sink: bypassSecurityTrustHtml)
 *
 * Safe effects asserted (no execution, no network, inert payloads):
 *   - DOM marker: injected <img data-poc> / <script data-poc> element PRESENCE
 *     in the rendered empty-state subtitle paragraph (markup injection through
 *     the trusted sink; jsdom does not execute scripts or fire onerror).
 *   - Escape-discarded marker: component.searchSubtitle contains the RAW
 *     payload and not its escaped form.
 *   - Control case: the KEY-shape subtitle (what the shipped regression suite
 *     exercises) is neutralized — proves the escape path itself works and that
 *     the defect is specific to the list/table searching-branch wiring.
 */

import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { escapeHtml } from "@decaf-ts/ui-decorators";
import { NavController } from '@ionic/angular/standalone';
import {
  TranslateLoader,
  TranslateModule,
  TranslateParser,
  TranslatePipe,
  TranslateService,
  Translation,
} from '@ngx-translate/core';
import { firstValueFrom, Observable, of } from 'rxjs';
import { EmptyStateComponent } from '../../src/lib/components/empty-state/empty-state.component';
import { ForAngularCommonModule } from '../../src/lib/for-angular-common.module';
import { I18nParser } from '../../src/lib/i18n';
import realEnTranslations from '../../src/lib/i18n/data/en.json';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

/** Loads the REAL production translation data (src/lib/i18n/data/en.json). */
class RealTranslationLoader implements TranslateLoader {
  getTranslation(): Observable<Translation> {
    return of(realEnTranslations as Translation);
  }
}

/**
 * Minimal, faithful replica of the list/table SEARCHING-branch host wiring.
 * The [subtitle] binding is copied verbatim from
 * src/lib/components/list/list.component.html (and identical in table.component.html).
 * Since the R2-1 remediation, ListComponent.parseSearchValue() HTML-escapes the search
 * term at the single interpolation point (list.component.ts), so `searchValue` below
 * stands in for `parseSearchValue()` — escaped, exactly as the real template receives it.
 * Pre-remediation (revision abb26f5) parseSearchValue returned the RAW string and these
 * tests demonstrated the bypass; they now assert the remediation holds on the same wiring.
 */
@Component({
  standalone: true,
  imports: [EmptyStateComponent, TranslatePipe],
  template: `
    <ngx-decaf-empty-state
      [translatable]="true"
      [title]="'component.list.search.title' | translate"
      [subtitle]="
        'component.list.search.subtitle'
          | translate: { '0': searchValueEscaped }
      "
      [searchValue]="searchValue"
    />
  `,
})
class ListSearchingBranchHost {
  @Input() searchValue = '';
  /** Stands in for ListComponent.parseSearchValue(): HTML-escape at the interpolation point. */
  get searchValueEscaped(): string {
    return escapeHtml(this.searchValue);
  }
}

describe('[SECURITY-POC] CF-1 empty-state search subtitle XSS (double interpolation defeats escapeHtml)', () => {
  let fixture: ComponentFixture<ListSearchingBranchHost>;
  let host: ListSearchingBranchHost;
  let translateService: TranslateService;

  const PAYLOAD_IMG = '<img src=x onerror="void 0" data-poc="cf1">';
  const PAYLOAD_SCRIPT = '<script data-poc="cf1">window.__POC_CF1_HIT__ = true;</script>';

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ForAngularCommonModule,
        ListSearchingBranchHost,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: RealTranslationLoader,
          },
          parser: {
            provide: TranslateParser,
            useClass: I18nParser,
          },
        }),
      ],
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    }).compileComponents();

    translateService = TestBed.inject(TranslateService);
    translateService.setDefaultLang('en');
    fixture = TestBed.createComponent(ListSearchingBranchHost);
    host = fixture.componentInstance;
  }));

  beforeEach(async () => {
    await firstValueFrom(translateService.use('en'));
  });

  it('upstream translate interpolates the RAW payload into the real production template (no escaping)', () => {
    const interpolated = translateService.instant('component.list.search.subtitle', {
      '0': PAYLOAD_IMG,
    });
    expect(interpolated).toBe(
      'You searched for: <ion-text color="primary" class="display-block ion-text-center text-bold">' +
        PAYLOAD_IMG +
        '</ion-text>'
    );
  });

  it('ngx-translate returns an already-interpolated (non-key) subtitle VERBATIM and discards the escaped param', async () => {
    const poisoned = translateService.instant('component.list.search.subtitle', { '0': PAYLOAD_IMG });
    const result = await firstValueFrom(translateService.get(poisoned, { '0': escapeHtml(PAYLOAD_IMG) }));
    expect(result).toBe(poisoned);
    expect(result).not.toContain('&lt;');
  });

  it('R2-1 FIXED: real list searching-branch wiring renders the <img onerror> payload as literal text (no injection through the trusted sink)', async () => {
    host.searchValue = PAYLOAD_IMG;
    fixture.detectChanges();
    const emptyState = fixture.debugElement.query(
      By.css('ngx-decaf-empty-state')
    ).componentInstance as EmptyStateComponent;
    await emptyState.ngOnInit();
    fixture.detectChanges();

    const p = fixture.debugElement.query(By.css('p'));
    expect(p).toBeTruthy();

    // the real translated template wrapper reached the sink
    expect(p.nativeElement.querySelector('ion-text')).toBeTruthy();

    // remediation: parseSearchValue escapes at the interpolation point, so the payload
    // reaches the trusted sink as inert text — no attacker element in the DOM
    const injected = p.nativeElement.querySelector('img[data-poc="cf1"]');
    expect(injected).toBeNull();

    // searchSubtitle carries the ESCAPED payload, not the raw form
    expect(emptyState.searchSubtitle).toContain('&lt;img');
    expect(emptyState.searchSubtitle).not.toContain(PAYLOAD_IMG);
    expect(p.nativeElement.textContent).toContain(PAYLOAD_IMG);

    // bounded safe-effect assertion: no execution attempted (jsdom is inert)
    expect((window as unknown as Record<string, unknown>)["__POC_CF1_HIT__"]).toBeUndefined();
  });

  it('R2-1 FIXED: a <script> element does not survive the trusted sink on the real wiring', async () => {
    host.searchValue = PAYLOAD_SCRIPT;
    fixture.detectChanges();
    const emptyState = fixture.debugElement.query(
      By.css('ngx-decaf-empty-state')
    ).componentInstance as EmptyStateComponent;
    await emptyState.ngOnInit();
    fixture.detectChanges();

    const p = fixture.debugElement.query(By.css('p'));
    const injected = p.nativeElement.querySelector('script[data-poc="cf1"]');
    expect(injected).toBeNull();
    expect((window as unknown as Record<string, unknown>)["__POC_CF1_HIT__"]).toBeUndefined();
  });

  it('CONTROL: KEY-shape subtitle (shipped-regression / probe shape) is neutralized — escape path holds', async () => {
    const componentFixture = TestBed.createComponent(EmptyStateComponent);
    const component = componentFixture.componentInstance;
    component.searchValue = PAYLOAD_IMG;
    component.subtitle = 'component.list.search.subtitle';
    await component.ngOnInit();
    componentFixture.detectChanges();

    const p = componentFixture.debugElement.query(By.css('p'));
    expect(p).toBeTruthy();
    expect(p.nativeElement.querySelector('img')).toBeNull();
    expect(p.nativeElement.querySelector('[onerror]')).toBeNull();
    expect(p.nativeElement.textContent).toContain('<img src=x onerror="void 0" data-poc="cf1">');
    expect(component.searchSubtitle).toContain('&lt;img');
  });
});
