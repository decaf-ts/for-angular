import { NgComponentOutlet } from '@angular/common';
import { OperationKeys } from '@decaf-ts/db-decorators';
import type { Meta, StoryObj } from '@storybook/angular';
import { ForAngularModel } from 'src/app/models/DemoModel';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { ForAngularCommonModule } from 'src/lib/for-angular-common.module';
import { fn } from 'storybook/test';
import './setup';
import { getComponentMeta } from './utils';

const model = new ForAngularModel({
  id: 1,
  name: 'John Doe',
  birthdate: '1989-12-12',
  email: 'john.doe@example.com',
  website: 'https://johndoe.example.com',
  password: 'password123',
});
const component = getComponentMeta<ModelRendererComponent<any>>([ForAngularCommonModule, NgComponentOutlet]);
const meta: Meta<ModelRendererComponent<any>> = {
  title: 'Components/Model Renderer',
  component: ModelRendererComponent,

  ...component,
  argTypes: {
    globals: {
      control: 'object',
    },
  },
  args: {
    model: new ForAngularModel({
      birthdate: '1989-12-12',
    }),
    globals: { operation: OperationKeys.CREATE },
    projectable: true,
    listenEvent: fn(),
    refreshEvent: fn(),
  },
};
export default meta;
type Story = StoryObj<ModelRendererComponent<any>>;

export const Create: Story = { args: {} };

export const Read: Story = {
  args: {
    model,
    globals: { operation: OperationKeys.READ },
  },
};

export const Update: Story = {
  args: {
    model,
    globals: { operation: OperationKeys.UPDATE },
  },
};

export const Delete: Story = {
  args: {
    model,
    globals: { operation: OperationKeys.DELETE, uid: 1 },
  },
};

export const NonProjectable: Story = {
  args: {
    model,
    globals: { operation: OperationKeys.READ },
    projectable: false,
  },
};
