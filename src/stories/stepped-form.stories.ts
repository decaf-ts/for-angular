import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { UIModelMetadata } from '@decaf-ts/ui-decorators';
import { IonButton, IonSkeletonText, IonText } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { CrudFieldComponent } from 'src/lib/components/crud-field/crud-field.component';
import { LayoutComponent } from 'src/lib/components/layout/layout.component';
import { SteppedFormComponent } from 'src/lib/components/stepped-form/stepped-form.component';
import './setup';
import { getComponentMeta } from './utils';

const children: UIModelMetadata[] = [
  { tag: 'ngx-decaf-crud-field', props: { name: 'firstName', label: 'First name', type: 'text', page: 1 } },
  { tag: 'ngx-decaf-crud-field', props: { name: 'lastName', label: 'Last name', type: 'text', page: 1 } },
  { tag: 'ngx-decaf-crud-field', props: { name: 'email', label: 'Email', type: 'email', page: 2 } },
  { tag: 'ngx-decaf-crud-field', props: { name: 'phone', label: 'Phone', type: 'text', page: 2 } },
];

const formGroup = new FormGroup({
  firstName: new FormControl(''),
  lastName: new FormControl(''),
  email: new FormControl(''),
  phone: new FormControl(''),
});

const component = getComponentMeta<SteppedFormComponent>([
  ReactiveFormsModule,
  TranslatePipe,
  IonSkeletonText,
  IonText,
  IonButton,
  LayoutComponent,
  CrudFieldComponent,
]);
const meta: Meta<SteppedFormComponent> = {
  title: 'Components/Stepped Form',
  component: SteppedFormComponent,

  ...component,
  args: {
    operation: OperationKeys.CREATE,
    children,
    formGroup,
    paginated: true,
    startPage: 1,
    pageTitles: [
      { title: 'Personal information', description: 'Tell us about yourself' },
      { title: 'Contact details', description: 'How can we reach you?' },
    ],
  },
};
export default meta;
type Story = StoryObj<SteppedFormComponent>;

export const Default: Story = {};

export const LastPage: Story = {
  args: {
    startPage: 2,
  },
};

export const SingleStep: Story = {
  args: {
    paginated: false,
  },
};
