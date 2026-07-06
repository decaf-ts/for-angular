import { FormsModule } from '@angular/forms';
import { IonButton, IonChip, IonIcon, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { CategoryModel } from 'src/app/models/CategoryModel';
import { FilterComponent } from 'src/lib/components/filter/filter.component';
import { IconComponent } from 'src/lib/components/icon/icon.component';
import { SearchbarComponent } from 'src/lib/components/searchbar/searchbar.component';
import { fn } from 'storybook/test';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<FilterComponent>([
  FormsModule,
  TranslatePipe,
  IonChip,
  IonIcon,
  IonButton,
  IonSelect,
  IonSelectOption,
  SearchbarComponent,
  IconComponent,
]);
const meta: Meta<FilterComponent> = {
  title: 'Components/Filter',
  component: FilterComponent,

  ...component,
  args: {
    model: new CategoryModel({}),
    multiple: true,
    disableSort: false,
    filterEvent: fn(),
    searchEvent: fn(),
  },
};
export default meta;
type Story = StoryObj<FilterComponent>;

export const init: Story = {};

export const singleFilter: Story = {
  args: {
    multiple: false,
  },
};

export const sortDisabled: Story = {
  args: {
    disableSort: true,
  },
};
