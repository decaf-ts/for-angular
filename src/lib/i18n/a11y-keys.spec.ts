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
  'component.model_builder.title',
  'component.model_builder.example',
  'component.model_builder.reset',
  'component.model_builder.model_settings',
  'component.model_builder.model_name',
  'component.model_builder.description',
  'component.model_builder.layout_columns',
  'component.model_builder.layout_rows',
  'component.model_builder.properties',
  'component.model_builder.add_property',
  'component.model_builder.empty_properties',
  'component.model_builder.toggle_property',
  'component.model_builder.move_up',
  'component.model_builder.move_down',
  'component.model_builder.remove_property',
  'component.model_builder.name',
  'component.model_builder.data_type',
  'component.model_builder.component_tag',
  'component.model_builder.render_component',
  'component.model_builder.list_model_tag',
  'component.model_builder.ui_element',
  'component.model_builder.custom_tag',
  'component.model_builder.label',
  'component.model_builder.placeholder',
  'component.model_builder.input_type',
  'component.model_builder.readonly',
  'component.model_builder.translatable',
  'component.model_builder.options_label',
  'component.model_builder.layout',
  'component.model_builder.column_span',
  'component.model_builder.column_default',
  'component.model_builder.none_default',
  'component.model_builder.row',
  'component.model_builder.order',
  'component.model_builder.custom_order_number',
  'component.model_builder.hide_on',
  'component.model_builder.validators',
  'component.model_builder.required',
  'component.model_builder.email',
  'component.model_builder.url',
  'component.model_builder.min',
  'component.model_builder.max',
  'component.model_builder.min_length',
  'component.model_builder.max_length',
  'component.model_builder.pattern',
  'component.model_builder.build_model',
  'component.model_builder.live_preview',
  'component.model_builder.preview_empty',
  'component.model_builder.model_name_example',
  'component.model_builder.description_placeholder',
  'component.model_builder.list_tag_example',
  'component.model_builder.property_name_placeholder',
  'component.model_builder.custom_tag_placeholder',
  'component.model_builder.display_label_placeholder',
  'component.model_builder.value_placeholder',
  'component.model_builder.options_placeholder',
  'component.model_builder.order_number_placeholder',
  'component.model_builder.pattern_placeholder',
  'component.model_builder.model_name_required',
  'component.model_builder.property_name_required',
  'component.model_builder.operations.create',
  'component.model_builder.operations.read',
  'component.model_builder.operations.update',
  'component.model_builder.operations.delete',
  'component.model_builder.tags.component_tag',
  'component.model_builder.tags.file_upload_tag',
  'component.model_builder.tags.search_bar_tag',
  'component.model_builder.tags.table_tag',
  'component.model_builder.tags.list_tag',
  'component.model_builder.tags.fieldset_tag',
  'component.model_builder.tags.select_field_tag',
  'component.model_builder.tags.raw_html_input_tag',
  'component.model_builder.tags.raw_html_textarea_tag',
  'component.model_builder.tags.custom_tag_option',
  'component.model_builder.half',
  'component.model_builder.full',
  'component.model_builder.first',
  'component.model_builder.last',
  'component.model_builder.build_failed',
  'component.model_builder.build_success',
  'component.cron_builder.step_value.hour',
  'component.cron_builder.step_value.minute',
  'component.cron_builder.increment',
  'component.cron_builder.decrement',
  'component.dashboard.tile_position',
  'component.dashboard.tile_keyboard_hint'
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

  it('model builder keys', () => {
    for (const key of NEW_A11Y_KEYS.filter((entry) => entry.startsWith('component.model_builder.'))) {
      expect(getNestedValue(en, key)?.trim().length).toBeGreaterThan(0);
      expect(getNestedValue(pt, key)?.trim().length).toBeGreaterThan(0);
    }
  });

});
