import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CrudFieldComponent } from './crud-field/crud-field.component';
import { CrudFormComponent } from './crud-form/crud-form.component';
import { ModelRendererComponent } from './model-renderer/model-renderer.component';
import { ListInfiniteComponent } from './list-infinite/list-infinite.component';
import { ForAngularModule } from '../for-angular.module';
import { SearchbarComponent } from './searchbar/searchbar.component';
import { ListPaginatedComponent } from './list-paginated/list-paginated.component';
import { EmptyStateComponent } from './empty-state/empty-state.component';

const Components = [
  CrudFieldComponent,
  CrudFormComponent,
  EmptyStateComponent,
  ModelRendererComponent,
  ListInfiniteComponent,
  ListPaginatedComponent,
  SearchbarComponent
];

@NgModule({
  imports: Components,
  declarations: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  exports: [Components, ForAngularModule],
})
export class ForAngularComponentsModule {}
