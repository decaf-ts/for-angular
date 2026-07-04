import './setup';

import { OperationKeys } from '@decaf-ts/db-decorators';
import {
    IonButton,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
    IonList,
    IonLoading,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonText,
    IonThumbnail,
} from '@ionic/angular/standalone';
import type { Meta, StoryObj } from '@storybook/angular';
import { CategoryModel } from 'src/app/models/CategoryModel';
import { ComponentRendererComponent } from 'src/lib/components/component-renderer/component-renderer.component';
import { EmptyStateComponent } from 'src/lib/components/empty-state/empty-state.component';
import { FilterComponent } from 'src/lib/components/filter/filter.component';
import { ListItemComponent } from 'src/lib/components/list-item/list-item.component';
import { ListComponent } from 'src/lib/components/list/list.component';
import { PaginationComponent } from 'src/lib/components/pagination/pagination.component';
import { SearchbarComponent } from 'src/lib/components/searchbar/searchbar.component';
import { ListComponentsTypes } from 'src/lib/engine/constants';
import { ForAngularCommonModule } from 'src/lib/for-angular-common.module';
import { fn } from 'storybook/test';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ListComponent>([
  ForAngularCommonModule,
  IonRefresher,
  IonLoading,
  IonButton,
  PaginationComponent,
  IonList,
  IonItem,
  IonThumbnail,
  IonSkeletonText,
  IonLabel,
  IonText,
  IonRefresherContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonThumbnail,
  IonSkeletonText,
  SearchbarComponent,
  EmptyStateComponent,
  FilterComponent,
  ListItemComponent,
  ComponentRendererComponent,
]);
const meta: Meta<ListComponent> = {
  title: 'Components/List',
  component: ListComponent,

  ...component,
  argTypes: {
    type: {
      control: 'select',
      options: Object.values(ListComponentsTypes),
    },
    lines: {
      control: 'select',
      options: ['inset', 'full', 'none'],
    },
    scrollPosition: {
      control: 'select',
      options: ['bottom', 'top'],
    },
  },
  args: {
    type: ListComponentsTypes.INFINITE,
    model: new CategoryModel({}),
    showSearchbar: true,
    showRefresher: true,
    enableFilter: true,
    multipleFilter: true,
    disableSort: false,
    inset: false,
    lines: 'full',
    loadMoreData: true,
    createButton: false,
    operations: [OperationKeys.READ],
    clickEvent: fn(),
    refreshEvent: fn(),
  },
};
export default meta;
type Story = StoryObj<ListComponent>;

export const infinite: Story = { args: {} };

export const paginated: Story = {
  args: {
    type: ListComponentsTypes.PAGINATED,
  },
};

export const withoutSearchbar: Story = {
  args: {
    showSearchbar: false,
  },
};

export const withoutRefresher: Story = {
  args: {
    showRefresher: false,
  },
};

export const filterDisabled: Story = {
  args: {
    enableFilter: false,
  },
};

export const insetStyle: Story = {
  args: {
    type: ListComponentsTypes.PAGINATED,
    inset: true,
  },
};

export const withCreateButton: Story = {
  args: {
    createButton: true,
    operations: [OperationKeys.READ, OperationKeys.CREATE],
  },
};

export const paginationWithoutTruncate: Story = {
  args: {
    type: ListComponentsTypes.PAGINATED,
    truncatePaginationPages: false,
  },
};
