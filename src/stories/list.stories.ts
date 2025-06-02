import type { Meta, StoryObj } from '@storybook/angular';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { getComponentMeta } from './utils';
import {
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonText,
  IonThumbnail,
  IonLoading
} from '@ionic/angular/standalone';
import { ListComponent } from 'src/lib/components/list/list.component';
import { SearchbarComponent } from 'src/lib/components/searchbar/searchbar.component';
import { EmptyStateComponent } from 'src/lib/components/empty-state/empty-state.component';
import { ListItemComponent } from 'src/lib/components/list-item/list-item.component';
import { ComponentRendererComponent } from 'src/lib/components/component-renderer/component-renderer.component';
import { PaginationComponent } from 'src/lib/components/pagination/pagination.component';
import { ListComponentsTypes } from 'src/lib/components/list/constants';
import { CategoryModel } from 'src/app/models/CategoryModel';

const component = getComponentMeta<ListComponent>([
    ForAngularModule,
    IonRefresher,
    IonLoading,
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
    ListItemComponent,
    ComponentRendererComponent
]);
console.log(component)
const meta: Meta<ListComponent> = {
  title: 'Components/List',
  component: ListComponent,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  ...component,
  args: {
    type: ListComponentsTypes.INFINITE,
    model: new CategoryModel({})
  }
};
export default meta;
type Story = StoryObj<ListComponent>;

export const infinite: Story = {args: { }};

export const paginated: Story = {args: {
  type: ListComponentsTypes.PAGINATED,
 }};


