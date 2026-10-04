import { IonIcon } from '@ionic/angular/standalone';
import type { Meta, StoryObj } from '@storybook/angular';
import { PaginationComponent } from 'src/lib/components/pagination/pagination.component';
import { expect, fn, userEvent, within } from 'storybook/test';
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

export const keyboardActivation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const current = canvas.getByRole('button', { name: /page 1/i });
    await expect(current).toHaveAttribute('aria-current', 'page');

    await userEvent.click(canvas.getByRole('button', { name: /next/i }));
    await expect(canvas.getByRole('button', { name: /page 2/i })).toHaveAttribute('aria-current', 'page');

    const page3 = canvas.getByRole('button', { name: /page 3/i });
    await userEvent.type(page3, '{Enter}');
    await expect(canvas.getByRole('button', { name: /page 3/i })).toHaveAttribute('aria-current', 'page');

    await userEvent.click(canvas.getByRole('button', { name: /previous/i }));
    await expect(canvas.getByRole('button', { name: /page 2/i })).toHaveAttribute('aria-current', 'page');
  },
};

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
