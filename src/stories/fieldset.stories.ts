import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { OperationKeys } from '@decaf-ts/db-decorators';
import {
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonReorder,
    IonReorderGroup,
    IonSpinner,
    IonText,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { FieldsetComponent } from 'src/lib/components/fieldset/fieldset.component';
import { IconComponent } from 'src/lib/components/icon/icon.component';
import { LayoutComponent } from 'src/lib/components/layout/layout.component';
import './setup';
import { getComponentMeta } from './utils';
// Imported for its `@Dynamic()` side-effect: registers 'ngx-decaf-crud-field' on the
// NgxRenderingEngine so ComponentRendererComponent can resolve the `children` tags below.
import { CrudFieldComponent } from 'src/lib/components/crud-field/crud-field.component';
import { KeyValue } from 'src/lib/engine/types';

function buildFieldsetFormState(items: KeyValue[]): Pick<FieldsetComponent, 'formGroup'> {
  const formGroup = new FormArray(
    items.map(
      (item) =>
        new FormGroup(
          Object.entries(item).reduce(
            (controls, [key, value]) => {
              controls[key] = new FormControl(value);
              return controls;
            },
            {} as Record<string, FormControl>
          )
        )
    )
  );

  return { formGroup };
}

const items: KeyValue[] = [
  { name: 'John Doe', email: 'john.doe@example.com' },
  { name: 'Jane Doe', email: 'jane.doe@example.com' },
];

// Field definitions for each contact entry, resolved dynamically by
// ngx-decaf-layout/ngx-decaf-component-renderer against the NgxRenderingEngine registry.
const children: KeyValue[] = [
  { tag: 'ngx-decaf-crud-field', props: { name: 'name', path: 'name', label: 'Name', type: 'text' } },
  { tag: 'ngx-decaf-crud-field', props: { name: 'email', path: 'email', label: 'Email', type: 'email' } },
];

const component = getComponentMeta<FieldsetComponent>([
  TranslatePipe,
  ReactiveFormsModule,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonReorder,
  IonReorderGroup,
  IonButton,
  IonIcon,
  LayoutComponent,
  IonSpinner,
  IconComponent,
  CrudFieldComponent,
]);
const meta: Meta<FieldsetComponent> = {
  title: 'Components/Fieldset',
  component: FieldsetComponent,

  ...component,
  args: {
    operation: OperationKeys.CREATE,
    title: 'Contacts',
    description: 'Add one or more contacts',
    multiple: true,
    editable: true,
    ordenable: true,
    required: false,
    borders: true,
    children,
    _data: items,
    ...buildFieldsetFormState(items),
  },
};
export default meta;
type Story = StoryObj<FieldsetComponent>;

export const Default: Story = {};

export const SingleItem: Story = {
  args: {
    multiple: false,
    _data: [items[0]],
    ...buildFieldsetFormState([items[0]]),
  },
};

export const ReadOnly: Story = {
  args: {
    operation: OperationKeys.READ,
    editable: false,
    ordenable: false,
  },
};

export const Required: Story = {
  args: {
    required: true,
    max: 3,
  },
};
