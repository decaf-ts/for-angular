/**
 * [SECURITY-POC] — N-1 + CF-5 confirmations (independent validation, Exploit Validator, SAA-1632).
 *
 * N-1 (SAA-1630 candidate, Low / hardening — content spoofing, NOT XSS):
 *   Data-driven values are rendered through plain `[innerHTML]` bindings. Angular's
 *   default sanitizer strips handlers/scripts but KEEPS benign markup, so stored
 *   (attacker-controlled) record values can render trusted-looking UI inside the app
 *   origin (credential-phishing / clickjacking-style redress). No script execution.
 *   Affected bindings cited by SAA-1630: table.component.html:128,131;
 *   list-item.component.html:60,70,75; crud-field.component.html; card.component.html:27,33.
 *   This POC drives the card component's real `inlineContent` [innerHTML] binding.
 *   Safe effect: presence of the spoofing ELEMENT with no script/no handlers attached.
 *
 * CF-5 (SAA-1629 candidate, Low / hardening — source disclosure):
 *   angular.json ships library and CLI TypeScript sources as public static assets:
 *   build assets include "src/cli-module.ts" and the src/lib glob (angular.json:138-139,
 *   test block :215). A previous build output in this workspace (www/) confirms
 *   `cli-module.ts` is copied verbatim into the served root. Static config assertion
 *   (a runtime HTTP fetch is out of scope for the jsdom harness).
 */

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import {
  TranslateLoader,
  TranslateModule,
  TranslateParser,
  TranslateService,
  Translation,
} from '@ngx-translate/core';
import { firstValueFrom, Observable, of } from 'rxjs';
import { CardComponent } from '../../src/lib/components/card/card.component';
import { I18nParser } from '../../src/lib/i18n';
import realEnTranslations from '../../src/lib/i18n/data/en.json';

class RealTranslationLoader implements TranslateLoader {
  getTranslation(): Observable<Translation> {
    return of(realEnTranslations as Translation);
  }
}
import * as fs from 'fs';
import * as path from 'path';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

@Component({
  standalone: true,
  imports: [CardComponent],
  template: `<ngx-decaf-card [inlineContent]="value"></ngx-decaf-card>`,
})
class CardInlineContentHost {
  value = '';
}

describe('[SECURITY-POC] N-1 data-driven [innerHTML] renders stored markup (content spoofing, no execution)', () => {
  let fixture: ComponentFixture<CardInlineContentHost>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [
        CardInlineContentHost,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: RealTranslationLoader },
          parser: { provide: TranslateParser, useClass: I18nParser },
        }),
      ],
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    }).compileComponents();
    const translateService = TestBed.inject(TranslateService);
    translateService.setDefaultLang('en');
    await firstValueFrom(translateService.use('en'));
    fixture = TestBed.createComponent(CardInlineContentHost);
  });

  it('stored value markup survives the default sanitizer as a spoofable element (no script, no handlers, no style attrs)', () => {
    fixture.componentInstance.value =
      '<div data-poc="n1" style="position:fixed;inset:0;background:#fff;z-index:9999">' +
      '<h1>Session expired — re-enter your password</h1></div><script>window.__POC_N1__=1</script>';
    fixture.detectChanges();

    const hostEl: HTMLElement = fixture.nativeElement;
    // Markup SURVIVES: attacker-supplied structural elements render as real DOM (content spoofing).
    const content = hostEl.querySelector('ion-card-content');
    expect(content).toBeTruthy();
    const spoofedHeading = content?.querySelector('h1');
    expect(spoofedHeading).toBeTruthy();
    expect(spoofedHeading?.textContent).toContain('re-enter your password');
    // Calibration vs SAA-1630's report: the sanitizer strips data-* AND style attributes,
    // so the "fixed full-screen overlay" variant does NOT survive — spoofing is
    // structural/textual, not pixel-perfect UI injection.
    expect(hostEl.querySelector('[style]')).toBeNull();
    expect(hostEl.querySelector('[data-poc]')).toBeNull();
    // Scripts and event handlers are stripped: no execution.
    expect(hostEl.querySelector('script')).toBeNull();
    expect(hostEl.querySelector('[onclick], [onerror], [onload]')).toBeNull();
    expect((window as unknown as Record<string, unknown>)['__POC_N1__']).toBeUndefined();
  });

  it('CONTROL: plain text value renders as text only (no element injection)', () => {
    fixture.componentInstance.value = 'just a normal value';
    fixture.detectChanges();
    const hostEl: HTMLElement = fixture.nativeElement;
    expect(hostEl.querySelector('div[data-poc="n1"]')).toBeNull();
    expect(hostEl.textContent).toContain('just a normal value');
  });
});

describe('[SECURITY-POC] CF-5 build ships library/CLI TypeScript sources as static assets', () => {
  const repoRoot = path.resolve(__dirname, '../..');

  it('angular.json build assets include src/cli-module.ts and src/lib/**/*', () => {
    const angularJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'angular.json'), 'utf8'));
    const appTarget = angularJson.projects['for-angular-app'].architect.build;
    const assets: string[] = appTarget.options.assets;
    expect(assets).toContain('src/cli-module.ts');
    expect(assets).toContain('src/lib/**/*');
  });

  it('prior build output (www/) contains the shipped cli-module.ts source verbatim', () => {
    const wwwCli = path.join(repoRoot, 'www', 'cli-module.ts');
    expect(fs.existsSync(wwwCli)).toBe(true);
    const content = fs.readFileSync(wwwCli, 'utf8');
    expect(content).toContain('NAME_PATTERN'); // real library CLI source, not a minified bundle
  });
});
