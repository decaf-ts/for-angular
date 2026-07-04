import { OperationKeys } from '@decaf-ts/db-decorators';
import { ElementSizes } from '@decaf-ts/ui-decorators';
import { IonAvatar, IonButton, IonButtons, IonHeader, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import type { Meta, StoryObj } from '@storybook/angular';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { IconComponent } from 'src/lib/components/icon/icon.component';
import { ForAngularCommonModule } from 'src/lib/for-angular-common.module';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<HeaderComponent>([
  ForAngularCommonModule,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonMenuButton,
  IonAvatar,
  IconComponent,
  BackButtonComponent,
]);
const meta: Meta<HeaderComponent> = {
  title: 'Components/Header',
  component: HeaderComponent,

  ...component,
  argTypes: {
    color: {
      control: 'select',
      options: ['white', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'danger', 'light', 'medium', 'dark'],
    },
    buttonMenuSlot: {
      control: 'select',
      options: ['start', 'end'],
    },
    size: {
      control: 'select',
      options: Object.values(ElementSizes),
    },
    operation: {
      control: 'select',
      options: Object.values(OperationKeys),
    },
  },
  args: {
    title: 'Header Component',
    operation: OperationKeys.READ,
    operations: [OperationKeys.CREATE],
    showMenuButton: true,
    buttonMenuSlot: 'start',
    showBackButton: true,
    translucent: true,
    showThemeToggleButton: true,
    sticky: false,
    floating: false,
    color: 'white',
    size: ElementSizes.expand,
    route: '/home',
  },
};
export default meta;
type Story = StoryObj<HeaderComponent>;

export const init: Story = {
  args: { title: meta.title + ' - init' },
};

export const withoutMenuButton: Story = {
  args: {
    showMenuButton: false,
  },
};

export const withoutBackButton: Story = {
  args: {
    showBackButton: false,
    operation: undefined,
  },
};

export const withLogo: Story = {
  args: {
    title: undefined,
    logo: 'assets/img/logo.svg',
  },
};

export const menuButtonAtEnd: Story = {
  args: {
    buttonMenuSlot: 'end',
  },
};

export const coloredPrimary: Story = {
  args: {
    color: 'primary',
  },
};

export const stickyHeader: Story = {
  args: {
    sticky: true,
  },
};

export const floatingHeader: Story = {
  args: {
    sticky: true,
    floating: true,
  },
};

export const smallSize: Story = {
  args: {
    size: ElementSizes.small,
  },
};
