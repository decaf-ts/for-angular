import en from './data/en.json';
import pt from './data/pt.json';

export const NEW_A11Y_KEYS = [
  'back',
  'theme.toggle',
  'create',
  'read',
  'update',
  'component.pagination.page',
  'component.list.filter.clear',
  'component.list.operations.read',
  'component.list.operations.update',
  'component.list.operations.delete',
  'component.file_upload.buttons.remove',
  'component.filter.clear',
  'component.filter.search',
  'component.filter.sort_asc',
  'component.filter.sort_desc',
  'component.filter.remove',
  'component.loading',
  'component.stepped_form.step_of',
  'component.layout.toggle',
  'component.crud_field.clear',
];

function getNestedValue(obj: Record<string, any>, path: string): string | undefined {
  return path.split('.').reduce((acc: any, part: string) => (acc ? acc[part] : undefined), obj);
}

describe('a11y i18n keys', () => {
  it('new a11y keys present in en and pt', () => {
    for (const key of NEW_A11Y_KEYS) {
      const enVal = getNestedValue(en, key);
      expect(typeof enVal).toBe('string');
      expect(enVal?.trim().length).toBeGreaterThan(0);

      const ptVal = getNestedValue(pt, key);
      expect(typeof ptVal).toBe('string');
      expect(ptVal?.trim().length).toBeGreaterThan(0);
    }
  });
});
