import { IonButton, IonSpinner } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { CardComponent } from 'src/lib/components/card/card.component';
import { EmptyStateComponent } from 'src/lib/components/empty-state/empty-state.component';
import { IconComponent } from 'src/lib/components/icon/icon.component';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<EmptyStateComponent>([
  IconComponent,
  TranslatePipe,
  IonSpinner,
  IonButton,
  CardComponent,
]);
const meta: Meta<EmptyStateComponent> = {
  title: 'Components/Empty State',
  component: EmptyStateComponent,

  ...component,
  args: {
    title: 'No records found',
    titleColor: 'gray-6',
    subtitle: 'There is no data to display at the moment.',
    subtitleColor: 'gray-4',
    showIcon: true,
    icon: 'folder-open-outline',
    iconSize: 'large',
    iconColor: 'medium',
    buttonText: 'Create new',
    buttonFill: 'solid',
    buttonColor: 'primary',
    buttonSize: 'default',
  },
};
export default meta;
type Story = StoryObj<EmptyStateComponent>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    buttonLink: '/home',
  },
};

export const Loading: Story = {
  args: {
    refreshing: true,
  },
};

export const NoIcon: Story = {
  args: {
    showIcon: false,
  },
};

export const SearchWithNoResults: Story = {
  args: {
    searchValue: 'decaf user',
    subtitle: 'No results found for "0"',
  },
};
