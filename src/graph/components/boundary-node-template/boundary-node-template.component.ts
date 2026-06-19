import { Component, EnvironmentInjector, inject, input } from '@angular/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import {
  NgDiagramBaseNodeTemplateComponent,
  NgDiagramNodeTemplate,
  NgDiagramModelService,
  NgDiagramPortComponent,
  type Node,
} from 'ng-diagram';
import { PortDirection } from '@decaf-ts/ui-decorators/graph';
import { getNgxModalCrudComponent } from 'src/lib/components/modal/modal.component';
import { GraphBoundaryNodeData } from '../../types';

@Component({
  selector: 'app-graph-boundary-node-template',
  standalone: true,
  imports: [NgDiagramBaseNodeTemplateComponent, NgDiagramPortComponent],
  templateUrl: './boundary-node-template.component.html',
  styleUrl: './boundary-node-template.component.scss',
})
export class GraphBoundaryNodeTemplateComponent implements NgDiagramNodeTemplate<GraphBoundaryNodeData> {
  node = input.required<Node<GraphBoundaryNodeData>>();
  private readonly modelService = inject(NgDiagramModelService);
  private readonly injector = inject(EnvironmentInjector);

  outputPorts() {
    return this.node().data.ports.filter((port) => port.direction === PortDirection.OUTPUT);
  }

  displayValue(value: unknown) {
    if (value === undefined || value === null || value === '') return 'empty';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toISOString();
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  async deleteNode(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.modelService.deleteNodes([this.node().id]);
  }

  async openEditor(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const ModelClass = this.node().data.modelClass;
    if (typeof ModelClass !== 'function') return;

    const model = Model.build({ value: this.node().data.value }, ModelClass as never) as Model;
    const modal = await getNgxModalCrudComponent(
      model as Model,
      {
        title: this.node().data.title,
      },
      {
        operation: OperationKeys.CREATE,
      },
      {},
      this.injector
    );

    await modal.present();
  }

  pinNode(event: Event) {
    event.preventDefault();
    event.stopPropagation();
  }

  toggleExpanded(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.modelService.updateNodeData(this.node().id, {
      ...this.node().data,
      expanded: !this.node().data.expanded,
    });
  }

  isExpanded() {
    return !!this.node().data.expanded;
  }
}
