import { OperationKeys } from '@decaf-ts/db-decorators';
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonModal,
    IonSpinner,
    IonTitle,
    IonToolbar,
} from '@ionic/angular/standalone';
import type { Meta, StoryObj } from '@storybook/angular';
import { ForAngularModel } from 'src/app/models/DemoModel';
import { ComponentRendererComponent } from 'src/lib/components/component-renderer/component-renderer.component';
import { IconComponent } from 'src/lib/components/icon/icon.component';
import { ModalComponent } from 'src/lib/components/modal/modal.component';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { fn } from 'storybook/test';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ModalComponent>([
  IonModal,
  ComponentRendererComponent,
  ModelRendererComponent,
  IconComponent,
  IonSpinner,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
]);
const meta: Meta<ModalComponent> = {
  title: 'Components/Modal',
  component: ModalComponent,

  ...component,
  args: {
    isOpen: true,
    title: 'Modal Title',
    inlineContent: 'This is the modal inline content.',
    inlineContentPosition: 'bottom',
    fullscreen: false,
    expandable: false,
    lightBox: false,
    headerTransparent: false,
    headerBackground: 'transparent',
    showHeader: true,
    showCloseButton: true,
    willDismissEvent: fn(),
  },
};
export default meta;
type Story = StoryObj<ModalComponent>;

export const init: Story = {};

export const fullscreen: Story = {
  args: {
    fullscreen: true,
  },
};

export const expandable: Story = {
  args: {
    expandable: true,
  },
};

export const lightBox: Story = {
  args: {
    lightBox: true,
    inlineContent: '<img src="https://ionicframework.com/docs/img/demos/card-media.png" />',
  },
};

export const noHeader: Story = {
  args: {
    showHeader: false,
  },
};

export const transparentHeader: Story = {
  args: {
    headerTransparent: true,
    headerBackground: 'primary',
  },
};

export const withModel: Story = {
  args: {
    inlineContent: undefined,
    model: new ForAngularModel({
      birthdate: '1989-12-12',
    }),
    globals: { operation: OperationKeys.READ },
  },
};

export const loading: Story = {
  args: {
    title: undefined,
    inlineContent: undefined,
  },
};
