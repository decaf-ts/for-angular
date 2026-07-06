import { IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle } from '@ionic/angular/standalone';
import type { Meta, StoryObj } from '@storybook/angular';
import { CardComponent } from 'src/lib/components/card/card.component';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<CardComponent>([
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonCardTitle,
  IonCardSubtitle,
]);
const meta: Meta<CardComponent> = {
  title: 'Components/Card',
  component: CardComponent,

  ...component,
  args: {
    type: 'clear',
    title: 'Card Title',
    subtitle: 'Card subtitle',
    body: 'default',
    color: '',
    separator: false,
    borders: true,
    margins: true,
    inlineContentPosition: 'bottom',
  },
};
export default meta;
type Story = StoryObj<CardComponent>;

export const init: Story = {};

export const shadow: Story = {
  args: {
    type: 'shadow',
    separator: true,
  },
};

export const withInlineContent: Story = {
  args: {
    inlineContent: '<p>Inline HTML content rendered inside the card body.</p>',
    inlineContentPosition: 'top',
  },
};

export const blankBody: Story = {
  args: {
    body: 'blank',
    title: '',
    subtitle: '',
  },
};
