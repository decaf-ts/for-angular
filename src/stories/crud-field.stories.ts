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
   name: 'field',
   label: 'Field Label',
   value: '',
   disabled: false,
   required: false,
   formGroup: undefined,
   component: undefined,
  }
};
export default meta;
type Story = StoryObj<CrudFieldComponent>;

export const text: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const element = canvas.queryByRole('ion-input');
    console.log(meta);
    // console.log(component.propDecorators)
  //  element.focus();
  },
};

export const focus: Story = {args: { type: 'text' }};
