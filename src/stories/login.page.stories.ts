import type { Meta, StoryObj } from '@storybook/angular';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { getComponentMeta } from './utils';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { ForAngularModel } from 'src/app/models/DemoModel';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { NgComponentOutlet } from '@angular/common';
import { LoginModel } from 'src/app/forms/LoginModel';
import { LoginPage } from 'src/app/pages/login/login.page';
import { ForAngularComponentsModule } from 'src/lib/components/for-angular-components.module';
import { IonCard, IonCardContent, IonImg } from '@ionic/angular/standalone';
import { ComponentsModule } from 'src/app/components/components.module';

const component = getComponentMeta<LoginPage>([
    ForAngularComponentsModule,
    IonCard,
    IonImg
  ], "page");

  const meta: Meta<LoginPage> = {
  title: 'Pages/Login',
  component: LoginPage,
  ...component,
  args: {
    model: new LoginModel({}),
  }
};
export default meta;
type Story = StoryObj<LoginPage>;

export const init: Story = {args: { }};


