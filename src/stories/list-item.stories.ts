import { OperationKeys } from '@decaf-ts/db-decorators';
import {
    IonButton,
    IonContent,
    IonIcon,
    IonItem,
    IonItemOption,
    IonItemOptions,
    IonItemSliding,
    IonLabel,
    IonList,
    IonListHeader,
    IonPopover,
} from '@ionic/angular/standalone';
import type { Meta, StoryObj } from '@storybook/angular';
import { IconComponent } from 'src/lib/components/icon/icon.component';
import { ListItemComponent } from 'src/lib/components/list-item/list-item.component';
import { fn } from 'storybook/test';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ListItemComponent>([
  IonList,
  IonListHeader,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonIcon,
  IonLabel,
  IonButton,
  IonContent,
  IconComponent,
  IonPopover,
]);
const meta: Meta<ListItemComponent> = {
  title: 'Components/List Item',
  component: ListItemComponent,

  ...component,
  args: {
    item: {},
    icon: 'star',
    iconSlot: 'start',
    title: 'List Item Title',
    description: 'List item description',
    info: '12/12/2024',
    subinfo: 'Subinfo text',
    lines: 'full',
    button: true,
    actionsType: 'inline',
    emitEvent: false,
    operations: [OperationKeys.READ],
    clickEvent: fn(),
  },
};
export default meta;
type Story = StoryObj<ListItemComponent>;

export const init: Story = {};

export const withActions: Story = {
  args: {
    operations: [OperationKeys.READ, OperationKeys.UPDATE, OperationKeys.DELETE],
  },
};

export const popoverActions: Story = {
  args: {
    actionsType: 'popover',
    operations: [OperationKeys.READ, OperationKeys.UPDATE, OperationKeys.DELETE],
  },
};

export const noButton: Story = {
  args: {
    button: false,
  },
};

export const iconAtEnd: Story = {
  args: {
    iconSlot: 'end',
  },
};
