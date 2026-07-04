import { IonIcon } from '@ionic/angular/standalone';
import type { Meta, StoryObj } from '@storybook/angular';
import { PaginationComponent } from 'src/lib/components/pagination/pagination.component';
import { fn } from 'storybook/test';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<PaginationComponent>([IonIcon]);
const meta: Meta<PaginationComponent> = {
  title: 'Components/Pagination',
  component: PaginationComponent,

  ...component,
  args: {
    totalPages: 10,
    current: 1,
    truncatePages: true,
    disablePages: false,
    bookMarkPagination: false,
    nextBookmark: '',
    clickEvent: fn(),
  },
};
export default meta;
type Story = StoryObj<PaginationComponent>;

export const init: Story = {};

export const middlePage: Story = {
  args: {
    current: 5,
  },
};

export const lastPage: Story = {
  args: {
    current: 10,
  },
};

export const fewPages: Story = {
  args: {
    totalPages: 3,
  },
};

export const noTruncate: Story = {
  args: {
    totalPages: 8,
    truncatePages: false,
  },
};

export const disabledPages: Story = {
  args: {
    disablePages: true,
  },
};

export const bookmarked: Story = {
  args: {
    bookMarkPagination: true,
    nextBookmark: 'bookmark-token',
  },
};
