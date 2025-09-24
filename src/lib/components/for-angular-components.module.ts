import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CrudFieldComponent } from './crud-field/crud-field.component';
import { CrudFormComponent } from './crud-form/crud-form.component';
import { ModelRendererComponent } from './model-renderer/model-renderer.component';
import { SearchbarComponent } from './searchbar/searchbar.component';
import { EmptyStateComponent } from './empty-state/empty-state.component';
import { ListItemComponent } from './list-item/list-item.component';
import { ComponentRendererComponent } from './component-renderer/component-renderer.component';
import { PaginationComponent } from './pagination/pagination.component';
import { ListComponent } from './list/list.component';
import { FieldsetComponent } from './fieldset/fieldset.component';
import { CollapsableDirective } from '../directives/collapsable.directive';
import { LayoutComponent } from './layout/layout.component';
import { FilterComponent } from './filter/filter.component';
import { StepedFormComponent } from './steped-form/steped-form.component';

const Directives = [CollapsableDirective];
const Components = [
  ModelRendererComponent,
  ComponentRendererComponent,
  CrudFieldComponent,
  CrudFormComponent,
  EmptyStateComponent,
  ListComponent,
  ListItemComponent,
  SearchbarComponent,
  PaginationComponent,
  CrudFormComponent,
  FieldsetComponent,
  LayoutComponent,
  FilterComponent,
  StepedFormComponent
];

@NgModule({
  imports: [...Components, ...Directives],
  declarations: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  exports: [...Components, ...Directives],
})
export class ForAngularComponentsModule {}
