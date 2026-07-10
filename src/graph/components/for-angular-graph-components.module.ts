/**
 * @module module:lib/components/for-angular-components.module
 * @description Aggregate module for library components.
 * @summary Bundles and exports all UI components from `src/lib/components` as an
 * Angular `NgModule`. This module re-exports components like `ListComponent`,
 * `PaginationComponent`, `SearchbarComponent`, and others so they can be imported
 * together in consumer applications.
 *
 * @link {@link ForAngularGraphComponentsModule}
 */

import { NgModule } from '@angular/core';
import { GraphBoundaryNodeTemplateComponent } from './boundary-node-template/boundary-node-template.component';
import { GraphNodeEditModalComponent } from './graph-node-edit-modal/graph-node-edit-modal.component';
import { GraphNodeTemplateComponent } from './graph-node-template/graph-node-template.component';
import { GraphPortFieldComponent } from './graph-port-field/graph-port-field.component';
import { GraphRendererComponent } from './graph-renderer/graph-renderer.component';

const Components = [
  GraphBoundaryNodeTemplateComponent,
  GraphNodeTemplateComponent,
  GraphRendererComponent,
  GraphPortFieldComponent,
  GraphNodeEditModalComponent,
];

@NgModule({
  imports: [...Components],
  declarations: [],
  schemas: [],
  exports: [...Components],
})
export class ForAngularGraphComponentsModule {}
