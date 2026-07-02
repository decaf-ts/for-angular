import './setup';
import type { Meta, StoryObj } from '@storybook/angular';
import { getComponentMeta } from './utils';
import { OperationKeys } from '@decaf-ts/db-decorators';
import {
  IonCheckbox,
  IonDatetime,
  IonInput,
  IonItem,
  IonLabel,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonRange,
  IonToggle,
  IonButton,
  IonDatetimeButton,
} from '@ionic/angular/standalone';
import { CrudFieldComponent } from 'src/lib/components/crud-field/crud-field.component';
import { PossibleInputTypes } from 'src/lib/engine/types';
import { FormControl, FormGroup } from '@angular/forms';

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
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  ...component,
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
    value: '',
    disabled: false,
    required: false,
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
