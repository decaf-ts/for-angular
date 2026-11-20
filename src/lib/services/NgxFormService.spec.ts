import { FormControl, FormGroup } from '@angular/forms';
import { HTML5InputTypes } from '@decaf-ts/ui-decorators';
import { NgxFormService } from './NgxFormService';

describe('NgxFormService', () => {
  describe('getFormData', () => {
    /**
     * R2-10: outbound form values must be saved RAW — HTML-escaping at storage
     * (the old `escapeHtml(value)?.trim()` in the default case) corrupted data:
     * searches stopped matching stored `&amp;`, edit round-trips accumulated
     * `&amp;amp;`, and raw-text consumers (CSV export, integrations) received
     * entities. Every render sink sanitizes by itself; storage keeps the truth.
     */
    const buildForm = (type: string, value: unknown): FormGroup =>
      new FormGroup({
        field: new FormControl(value),
      });

    it('returns string values unescaped (save raw, escape at render)', () => {
      const form = buildForm(HTML5InputTypes.TEXT, 'R&D <Prototype> "quoted" it\'s');
      const data = NgxFormService.getFormData(form);
      expect(data['field']).toBe('R&D <Prototype> "quoted" it\'s');
    });

    it('does not re-escape already-escaped values (no &amp;amp; accumulation)', () => {
      const form = buildForm(HTML5InputTypes.TEXT, 'R&amp;D');
      const data = NgxFormService.getFormData(form);
      expect(data['field']).toBe('R&amp;D');
    });

    it('still trims string values (kept normalization)', () => {
      const form = buildForm(HTML5InputTypes.TEXT, '  padded  ');
      const data = NgxFormService.getFormData(form);
      expect(data['field']).toBe('padded');
    });

    it('passes non-string values through untouched', () => {
      const objectValue = { nested: 'R&D <x>' };
      const form = buildForm(HTML5InputTypes.TEXT, objectValue);
      const data = NgxFormService.getFormData(form);
      expect(data['field']).toBe(objectValue);
    });
  });
});
