import { FieldProperties } from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition } from '../../engine/types';

export const DefaultCrudFieldDefinition: FieldProperties &
  AngularFieldDefinition = {
  autocapitalize: '',
  autocomplete: 'off',
  autocorrect: 'off',
  autofocus: false,
  clearInput: false,
  counter: false,
  disabled: false,
  label: '',
  labelPlacement: 'floating',
  name: '',
  readonly: false,
  required: false,
  spellcheck: false,
  type: 'text',
  value: '',
  cancelText: '',
  interface: 'popover',
  interfaceOptions: {},
  selectedText: '',
  checked: false,
  className: ''
};
