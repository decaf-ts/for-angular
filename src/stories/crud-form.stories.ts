import { OperationKeys } from '@decaf-ts/db-decorators';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import type { Meta, StoryObj } from '@storybook/angular';
import { ForAngularModel } from 'src/app/models/DemoModel';
import { CrudFormComponent } from 'src/lib/components/crud-form/crud-form.component';
import { LayoutComponent } from 'src/lib/components/layout/layout.component';
import './setup';
import { getComponentMeta } from './utils';

const model = new ForAngularModel({
  id: 1,
  name: 'John Doe',
  birthdate: '1989-11-10',
  email: 'dcarvalho@decaf.com',
  website: 'https://decaf-ts.com',
  password: 'password123',
});
const component = getComponentMeta<CrudFormComponent>([IonButton, IonIcon, LayoutComponent]);
const meta: Meta<CrudFormComponent> = {
  title: 'Components/Crud Form',
  component: CrudFormComponent,

  ...component,
  args: {
    operation: OperationKeys.CREATE,
    model: new ForAngularModel({ birthdate: '1989-12-12' }),
    showCancelButton: true,
    allowClear: false,
  },
};
export default meta;
type Story = StoryObj<CrudFormComponent>;

export const Create: Story = {};

export const Update: Story = {
  args: {
    operation: OperationKeys.UPDATE,
    model,
  },
};

export const Read: Story = {
  args: {
    operation: OperationKeys.READ,
    model,
  },
};

export const Delete: Story = {
  args: {
    operation: OperationKeys.DELETE,
    model,
  },
};
