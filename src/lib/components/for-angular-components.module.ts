/**
 * @module module:lib/components/for-angular-components.module
 * @description Aggregate module for library components.
 * @summary Bundles and exports all UI components from `src/lib/components` as an
 * Angular `NgModule`. This module re-exports components like `ListComponent`,
 * `PaginationComponent`, `SearchbarComponent`, and others so they can be imported
 * together in consumer applications.
 *
 * @link {@link ForAngularComponentsModule}
 */

import { NgModule } from '@angular/core';
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
import { LayoutComponent } from './layout/layout.component';
import { FilterComponent } from './filter/filter.component';
import { SteppedFormComponent } from './stepped-form/stepped-form.component';
import { IconComponent } from './icon/icon.component';
import { CardComponent } from './card/card.component';
import { FileUploadComponent } from './file-upload/file-upload.component';

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
  SteppedFormComponent,
  IconComponent,
  CardComponent,
  FileUploadComponent
];

@NgModule({
  imports: [...Components],
  declarations: [],
  schemas: [],
  exports: [...Components],
})
export class ForAngularComponentsModule {}
