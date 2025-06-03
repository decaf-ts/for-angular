import type { Meta, StoryObj } from '@storybook/angular';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { getComponentMeta } from './utils';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { ForAngularModel } from 'src/app/models/DemoModel';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { NgComponentOutlet } from '@angular/common';

const model = new ForAngularModel({
    id: 1,
    name: 'John Doe',
    birthdate: '1989-12-12',
    email: 'john.doe@example.com',
    website: 'https://johndoe.example.com',
    password: 'password123',
});
const component = getComponentMeta<ModelRendererComponent<any>>([ForAngularModule, NgComponentOutlet]);
const meta: Meta<ModelRendererComponent<any>> = {
  title: 'Components/Model Renderer',
  component: ModelRendererComponent,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  ...component,
  args: {
      model: new ForAngularModel({
       birthdate: '1989-12-12'
      }),
    globals: {operation: OperationKeys.CREATE}
  }
};
export default meta;
type Story = StoryObj<ModelRendererComponent<any>>;

export const Create: Story = {args: { }};

export const Read: Story = {args: {
  model,
  globals: {operation: OperationKeys.READ}
}};

export const Update: Story = {args: {
  model,
  globals: {operation: OperationKeys.UPDATE}
}};

export const Delete: Story = {args: {
  model,
  globals: {operation: OperationKeys.DELETE, uid: 1}
}};
