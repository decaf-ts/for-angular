import type { Meta, StoryObj } from '@storybook/angular';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { getComponentMeta } from './utils';
import { OperationKeys } from '@decaf-ts/db-decorators';


const component = getComponentMeta<HeaderComponent>([ForAngularModule, IonHeader, IonTitle, IonToolbar, BackButtonComponent]);
const meta: Meta<HeaderComponent> = {
  title: 'Components/Header',
  component: HeaderComponent,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  ...component,
  args: {
    title: "Header Component",
    operations: [OperationKeys.CREATE],
  }
};
export default meta;
type Story = StoryObj<HeaderComponent>;

export const init: Story = {args: { title: meta.title + ' - init',  route: '/home' }};

