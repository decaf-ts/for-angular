import type { Meta, StoryObj } from '@storybook/angular';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { getComponentMeta } from './utils';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { ForAngularModel } from 'src/app/models/DemoModel';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { NgComponentOutlet } from '@angular/common';


const component = getComponentMeta<ModelRendererComponent<any>>([ForAngularModule, NgComponentOutlet]);
const meta: Meta<ModelRendererComponent<any>> = {
  title: 'Components/ModelRendererComponent',
  component: ModelRendererComponent,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  ...component,
  args: {
      model: new ForAngularModel({
      name: 'John Doe',
      birthdate: '1989-12-12',
      email: 'john.doe@example.com',
      website: 'https://johndoe.example.com',
      password: 'password123',
    }),
    globals: {operation: OperationKeys.CREATE}
  }
};
export default meta;
type Story = StoryObj<ModelRendererComponent<any>>;

export const init: Story = {args: { }};
