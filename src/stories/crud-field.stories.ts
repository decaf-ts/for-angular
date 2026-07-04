import { FormControl, FormGroup } from '@angular/forms';
import { OperationKeys } from '@decaf-ts/db-decorators';
import {
    IonButton,
    IonCheckbox,
    IonDatetime,
    IonDatetimeButton,
    IonInput,
    IonItem,
    IonLabel,
    IonRadio,
    IonRadioGroup,
    IonRange,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonToggle,
} from '@ionic/angular/standalone';
import type { Meta, StoryObj } from '@storybook/angular';
import { CrudFieldComponent } from 'src/lib/components/crud-field/crud-field.component';
import { PossibleInputTypes } from 'src/lib/engine/types';
import './setup';
import { getComponentMeta } from './utils';

function buildFormState(name: string, value: string = ''): Pick<CrudFieldComponent, 'formGroup' | 'path'> {
  const formGroup = new FormGroup({
    [name]: new FormControl(value),
  });

  return {
    formGroup,
    path: name,
  };
}

const component = getComponentMeta<CrudFieldComponent>([
  IonInput,
  IonItem,
  IonCheckbox,
  IonRadioGroup,
  IonRadio,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonDatetime,
  IonLabel,
  IonRange,
  IonToggle,
  IonButton,
  IonDatetimeButton,
]);
const meta: Meta<CrudFieldComponent> = {
  title: 'Components/Crud Field',
  component: CrudFieldComponent,

  ...component,
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'number', 'email', 'password', 'date', 'textarea', 'checkbox', 'radio', 'select', 'tel', 'url'],
    },
    labelPlacement: {
      control: 'select',
      options: ['start', 'end', 'floating', 'stacked', 'fixed'],
    },
    fill: {
      control: 'select',
      options: ['outline', 'solid'],
    },
  },
  render: (args) => {
    const { formGroup, path } = buildFormState(args.name, String(args.value ?? ''));

    return {
      props: {
        ...args,
        formGroup,
        path: args.path || path,
      },
    };
  },
  args: {
    operation: OperationKeys.CREATE,
    type: 'text' as PossibleInputTypes,
    name: 'name',
    label: 'Field Label',
    placeholder: 'Type here...',
    value: '',
    disabled: false,
    readonly: false,
    required: false,
    hidden: false,
    ...buildFormState('name'),
    component: undefined,
    translatable: false,
  },
};
export default meta;
type Story = StoryObj<CrudFieldComponent>;

export const init: Story = {};

export const focus: Story = {
  play: ({ canvasElement }) => {
    const input = canvasElement.querySelector('ion-input') as HTMLIonInputElement;
    if (input) {
      setTimeout(() => {
        input.value = 'New Value';
        input.setFocus();
      }, 100);
    }
  },
};

export const required: Story = {
  args: {
    required: true,
    validationMessage: 'This field is required',
  },
};

export const disabled: Story = {
  args: {
    disabled: true,
    value: 'Read-only content',
  },
};

export const readonly: Story = {
  args: {
    readonly: true,
    value: 'Cannot be edited',
  },
};

export const numberField: Story = {
  args: {
    ...buildFormState('quantity', '1'),
    name: 'quantity',
    label: 'Quantity',
    type: 'number' as PossibleInputTypes,
    value: 1,
    min: 0,
    max: 100,
    step: 1,
  },
};

export const textareaField: Story = {
  args: {
    ...buildFormState('description', ''),
    name: 'description',
    label: 'Description',
    type: 'textarea' as PossibleInputTypes,
    placeholder: 'Enter a description...',
  },
};

export const checkboxField: Story = {
  args: {
    ...buildFormState('accepted', ''),
    name: 'accepted',
    label: 'Accept terms and conditions',
    type: 'checkbox' as PossibleInputTypes,
    checked: false,
  },
};

export const radioField: Story = {
  args: {
    ...buildFormState('color', ''),
    name: 'color',
    label: 'Favorite Color',
    type: 'radio' as PossibleInputTypes,
    options: [
      { value: 'red', text: 'Red' },
      { value: 'green', text: 'Green' },
      { value: 'blue', text: 'Blue' },
    ],
  },
};

export const selectField: Story = {
  args: {
    ...buildFormState('country', ''),
    name: 'country',
    label: 'Country',
    type: 'select' as PossibleInputTypes,
    options: [
      { value: 'pt', text: 'Portugal' },
      { value: 'br', text: 'Brazil' },
      { value: 'us', text: 'United States' },
    ],
  },
};

export const readOperation: Story = {
  args: {
    operation: OperationKeys.READ,
    value: 'Read-only value',
  },
};
