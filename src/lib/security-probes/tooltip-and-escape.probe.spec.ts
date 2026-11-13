/**
 * SECURITY-REVIEW PROBE — SAA-1630 (Red Team Web Pentester). DO NOT COMMIT.
 *
 * Tooltip directive + file-upload escapeHtml sink probes.
 * - Tooltip content must render as a text node only (no markup, no handlers).
 * - file-upload preview() builds `<img src="...">` from a caller string:
 *   escapeHtml must prevent attribute breakout and the javascript: scheme
 *   must stay inert in img src (modern browsers never execute it).
 */
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../for-angular-common.module';
import { I18nFakeLoader } from '../i18n';
import { DecafTooltipDirective } from '../directives/tooltip.directive';
import { escapeHtml } from '../components/empty-state/empty-state.component';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

@Component({
  selector: 'probe-tooltip-host',
  standalone: true,
  imports: [DecafTooltipDirective],
  template: `<span [ngx-decaf-tooltip]="{ text: tooltipText, limit: 5 }">host</span>`,
})
class ProbeTooltipHost {
  @Input() tooltipText = '';
}

describe('[SAA-1630 PROBE] tooltip directive injection', () => {
  let fixture: ComponentFixture<ProbeTooltipHost>;

  beforeEach(waitForAsync(() => {
    (window as any)['__ttExecuted'] = false;
    TestBed.configureTestingModule({
      imports: [ProbeTooltipHost, ForAngularCommonModule, TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: I18nFakeLoader } })],
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    }).compileComponents();
    fixture = TestBed.createComponent(ProbeTooltipHost);
  }));

  it('img-onerror tooltip payload creates no img element and no handler', () => {
    const XSS = 'window.__ttExecuted=true';
    fixture.componentInstance.tooltipText = `<img src=x onerror="${XSS}">`;
    fixture.detectChanges();
    const span = fixture.debugElement.query(By.css('span'));
    expect(span.nativeElement.querySelector('img')).toBeNull();
    expect(span.nativeElement.querySelector('[onerror]')).toBeNull();
    expect((window as any)['__ttExecuted']).toBe(false);
  });
});

describe('[SAA-1630 PROBE] file-upload img-src attribute breakout (escapeHtml consumer)', () => {
  it('escapeHtml prevents attribute breakout in the preview <img src=...> construction', () => {
    const XSS = 'window.__fuExecuted=true';
    (window as any)['__fuExecuted'] = false;
    // mirrors file-upload.component.ts:591
    const file = `x" onerror="${XSS}`;
    const content = `<img src="${escapeHtml(file)}" style="max-width: 100%; height: auto;" />`;
    const host = document.createElement('div');
    host.innerHTML = content;
    const img = host.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('onerror')).toBeNull();
    expect((window as any)['__fuExecuted']).toBe(false);
    // the quote is entity-encoded in the markup and round-trips as a literal
    // quote INSIDE the attribute value (getAttribute decodes entities)
    expect(img?.getAttribute('src')).toContain('" onerror="');
    expect(img?.outerHTML).not.toContain('<img src="x" onerror');
  });

  it('javascript: img src does not execute in the jsdom sink (defense-in-depth check)', () => {
    (window as any)['__fuExecuted'] = false;
    const content = `<img src="${escapeHtml('javascript:window.__fuExecuted=true')}">`;
    const host = document.createElement('div');
    host.innerHTML = content;
    expect((window as any)['__fuExecuted']).toBe(false);
  });
});
