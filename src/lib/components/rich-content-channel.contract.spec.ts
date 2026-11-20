/**
 * @module lib/components/rich-content-channel.contract.spec
 * @description Contract lock for the rich-content `[innerHTML]` channel (round-2 assessment, R2-5).
 * @summary The table cell, crud-field value and list-item text bindings intentionally render
 * host/model-supplied HTML through Angular's **default** sanitizer — never the `safeHtml` bypass.
 *
 * Production hosts (e.g. ew-frontend) depend on this channel:
 * - table cells carry icon markup (`<span class="ti ti-qrcode">` + translated label) with the
 *   interaction wired by framework callbacks (`uionclick` → handler `handleClick`), never by
 *   markup attributes;
 * - crud-field values carry icon spans the same way;
 * - list-item/select option texts carry styled markup
 *   (`<span class="dcf-option-description">…</span>`).
 *
 * The default sanitizer keeps such markup (images, icons, structure, safe links) while stripping
 * execution vectors (`script`, event-handler attributes, `javascript:` URLs). The accepted
 * residual is execution-proof content spoofing (fake banner/link from a stored value) — a
 * backend-data trust problem, not a module defect (see `workdocs/security-assessment-round2-report.md`, R2-5).
 *
 * This spec locks the contract from both sides:
 * 1. source level — the channel templates keep plain `[innerHTML]` data bindings and never
 *    import the `safeHtml` bypass (which would disable sanitization entirely);
 * 2. behavior level — Angular's binding + sanitizer semantics hold for the payloads hosts rely
 *    on: markup survives, execution vectors are stripped, plain text renders as text.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

describe('[SECURITY-CONTRACT] R2-5 rich-content [innerHTML] channel', () => {
  /** Channel templates (relative to this spec's directory) and the data bindings they must keep. */
  const channelTemplates: Array<{ file: string; bindings: RegExp[] }> = [
    {
      file: 'table/table.component.html',
      bindings: [/\[innerHTML\]="col\.value\.value"/],
    },
    {
      file: 'crud-field/crud-field.component.html',
      bindings: [/\[innerHTML\]="value"/, /\? value/],
    },
    {
      file: 'list-item/list-item.component.html',
      bindings: [/\[innerHTML\]="description"/, /\[innerHTML\]="info"/, /\[innerHTML\]="subinfo"/],
    },
  ];

  it('channel templates keep plain [innerHTML] data bindings and never use the safeHtml bypass', () => {
    for (const { file, bindings } of channelTemplates) {
      const source = readFileSync(join(__dirname, file), 'utf8');
      for (const binding of bindings) {
        expect(source).toMatch(binding);
      }
      expect(source).not.toContain('| safeHtml');
    }
  });

  describe('sanitizer semantics relied upon by hosts', () => {
    let fixture: ComponentFixture<RichContentHost>;

    @Component({
      standalone: true,
      template: `<div #host [innerHTML]="value"></div>`,
    })
    class RichContentHost {
      value = '';
    }

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [RichContentHost],
        providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
      }).compileComponents();
      fixture = TestBed.createComponent(RichContentHost);
    });

    it('markup hosts rely on survives: img with remote src, icons, structural elements, safe links', () => {
      fixture.componentInstance.value =
        '<img src="https://example.com/photo.png" alt="photo">' +
        '<span class="ti ti-qrcode"></span>' +
        '<h4>banner</h4>' +
        '<a href="https://example.com/ok">ok</a>';
      fixture.detectChanges();

      const host: HTMLElement = fixture.nativeElement;
      expect(host.querySelector('img[src="https://example.com/photo.png"]')).toBeTruthy();
      expect(host.querySelector('span.ti-qrcode')).toBeTruthy();
      expect(host.querySelector('h4')).toBeTruthy();
      expect(host.querySelector('a[href="https://example.com/ok"]')).toBeTruthy();
    });

    it('execution vectors are stripped: script element, event-handler attributes, javascript: URLs', () => {
      fixture.componentInstance.value =
        '<script>window.__contractLeak__=true</script>' +
        '<img src="https://example.com/x.png" onerror="window.__contractLeak__=true">' +
        '<a href="javascript:window.__contractLeak__=true">phish</a>';
      fixture.detectChanges();

      const host: HTMLElement = fixture.nativeElement;
      expect(host.querySelector('script')).toBeNull();
      expect(host.querySelector('[onerror], [onclick], [onload]')).toBeNull();
      expect(host.querySelector('a[href^="javascript:"]')).toBeNull();
      expect((window as unknown as Record<string, unknown>)['__contractLeak__']).toBeUndefined();
    });

    it('plain text renders as text only (no element injection)', () => {
      fixture.componentInstance.value = 'just a normal value';
      fixture.detectChanges();
      const host: HTMLElement = fixture.nativeElement;
      expect(host.querySelector('script')).toBeNull();
      expect(host.textContent).toContain('just a normal value');
    });
  });
});
