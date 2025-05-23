import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CrudFieldComponent } from './crud-field/crud-field.component';
import { CrudFormComponent } from './crud-form/crud-form.component';
import { ModelRendererComponent } from './model-renderer/model-renderer.component';
import { ForAngularModule } from '../for-angular.module';
import { SearchbarComponent } from './searchbar/searchbar.component';
import { EmptyStateComponent } from './empty-state/empty-state.component';
import { ListItemComponent } from './list-item/list-item.component';
import { ComponentRendererComponent } from './component-renderer/component-renderer.component';
import { PaginationComponent } from './pagination/pagination.component';
import { ListComponent } from './list/list.component';

const Components = [
  ModelRendererComponent,
  ComponentRendererComponent,
  CrudFieldComponent,
  CrudFormComponent,
  EmptyStateComponent,
  ListComponent,
  ListItemComponent,
  SearchbarComponent,
  PaginationComponent
];

@NgModule({
  imports: Components,
  declarations: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  exports: [Components, ForAngularModule],
})
export class ForAngularComponentsModule {}
