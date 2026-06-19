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
import type { GraphDemoNodeData } from './types';
import { getNgxModalCrudComponent } from 'src/lib/components/modal/modal.component';

@Component({
  selector: 'app-graph-node-template',
  standalone: true,
  imports: [NgDiagramBaseNodeTemplateComponent, NgDiagramPortComponent],
  templateUrl: './graph-node-template.component.html',
  styleUrl: './graph-node-template.component.scss',
})
export class GraphNodeTemplateComponent implements NgDiagramNodeTemplate<GraphDemoNodeData> {
  node = input.required<Node<GraphDemoNodeData>>();
  private readonly modelService = inject(NgDiagramModelService);
  private readonly injector = inject(EnvironmentInjector);

  inputPorts() {
    return this.visiblePorts(PortDirection.INPUT);
  }

  outputPorts() {
    return this.visiblePorts(PortDirection.OUTPUT);
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

    const model = Model.build({}, ModelClass as never) as Model;
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

  hasExpandablePorts(direction: PortDirection) {
    return this.node()
      .data.ports.some((port) => port.direction === direction && !!port.children?.length);
  }

  visiblePorts(direction: PortDirection) {
    return this.node().data.ports
      .filter((port) => port.direction === direction)
      .flatMap((port) => this.portLeaves(port));
  }

  portLeaves(port: GraphDemoNodeData['ports'][number]): GraphDemoNodeData['ports'] {
    if (port.children?.length && this.isExpanded()) {
      return port.children.flatMap((child) => this.portLeaves(child));
    }

    return [port];
  }
}
