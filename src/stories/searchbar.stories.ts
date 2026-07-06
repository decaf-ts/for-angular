import { IonSearchbar } from '@ionic/angular/standalone';
import type { Meta, StoryObj } from '@storybook/angular';
import { SearchbarComponent } from 'src/lib/components/searchbar/searchbar.component';
import { fn } from 'storybook/test';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<SearchbarComponent>([IonSearchbar]);
const meta: Meta<SearchbarComponent> = {
  title: 'Components/Searchbar',
  component: SearchbarComponent,

  ...component,
  args: {
    placeholder: 'Search',
    debounce: 500,
    disabled: false,
    animated: true,
    showCancelButton: 'never',
    showClearButton: 'focus',
    buttonCancelText: 'Cancel',
    queryKeys: 'name',
    isVisible: true,
    wrapper: false,
    emitEventToWindow: false,
    searchEvent: fn(),
  },
};
export default meta;
type Story = StoryObj<SearchbarComponent>;

export const Default: Story = {};

export const WithCancelButton: Story = {
  args: {
    showCancelButton: 'always',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const WithWrapper: Story = {
  args: {
    wrapper: true,
    wrapperColor: 'primary',
  },
};
