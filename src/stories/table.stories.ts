import { CommonModule } from '@angular/common';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { CategoryModel } from 'src/app/models/CategoryModel';
import { EmptyStateComponent } from 'src/lib/components/empty-state/empty-state.component';
import { IconComponent } from 'src/lib/components/icon/icon.component';
import { PaginationComponent } from 'src/lib/components/pagination/pagination.component';
import { SearchbarComponent } from 'src/lib/components/searchbar/searchbar.component';
import { TableComponent } from 'src/lib/components/table/table.component';
import { DecafTooltipDirective } from 'src/lib/directives';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<TableComponent>([
  CommonModule,
  TranslatePipe,
  IonSelect,
  IonSelectOption,
  SearchbarComponent,
  EmptyStateComponent,
  IconComponent,
  PaginationComponent,
  DecafTooltipDirective,
]);
const meta: Meta<TableComponent> = {
  title: 'Components/Table',
  component: TableComponent,

  ...component,
  args: {
    model: new CategoryModel({}),
    operations: [OperationKeys.READ, OperationKeys.UPDATE, OperationKeys.DELETE],
    allowOperations: true,
    maxContentLength: -1,
  },
};
export default meta;
type Story = StoryObj<TableComponent>;

export const Default: Story = {};

export const ReadOnly: Story = {
  args: {
    operations: [OperationKeys.READ],
    allowOperations: false,
  },
};

export const TruncatedContent: Story = {
  args: {
    maxContentLength: 40,
  },
};
