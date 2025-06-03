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
import {
  PossibleInputTypes,
} from 'src/lib/engine/types';
import { within } from '@storybook/test';
import { FormControl, FormGroup } from '@angular/forms';
import { NgxFormService } from 'src/lib/engine/NgxFormService';

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
    IonDatetimeButton
  ]);
const meta: Meta<CrudFieldComponent> = {
  title: 'Components/Crud Field',
  component: CrudFieldComponent,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  ...component,
  args: {
   operation: OperationKeys.CREATE,
   type: 'text' as PossibleInputTypes,
   name: 'name',
   label: 'Field Label',
   value: '',
   disabled: false,
   required: false,
   formGroup:  new FormGroup({}),
   component: undefined,
  }
};
export default meta;
type Story = StoryObj<CrudFieldComponent>;

export const init: Story = {};

export const focus: Story = {
  play: ({ args, canvasElement }) => {
    const input = canvasElement.querySelector('ion-input') as HTMLIonInputElement;
    console.log(input);
    if (input) {
      setTimeout(() => {
        input.value = 'New Value';
        input.setFocus();
        // input.dispatchEvent(new CustomEvent('input', { detail: { value: 'New Value' } }));
        // args.formGroup.updateValueAndValidity();
        // args.formGroup.setErrors(null);
      }, 100);
    }
  },
};
