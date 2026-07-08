import { Component, computed, input, model, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { IonSpinner } from '@ionic/angular/standalone';
import {
  Model,
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  NgDiagramMinimapComponent,
  provideNgDiagram,
} from 'ng-diagram';
import { map } from 'rxjs';
import { GraphPublishingWorkflow } from 'src/app/pages/graph/workflow-root';
import { NgxGraphDirective } from 'src/graph/NgxGraphDirective';
import { ContainerComponent } from 'src/lib/components';
import { GraphHeaderbarComponent } from '../graph-headerbar/graph-headerbar.component';
import { GraphHomeComponent } from '../home/home.component';
import { GraphSidebarMenuComponent } from '../sidebar-menu/sidebar-menu.component';
import { GraphWorkflowComponent } from '../workflow/workflow.component';

@Component({
  selector: 'app-graph-renderer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgDiagramComponent,
    NgDiagramBackgroundComponent,
    NgDiagramMinimapComponent,
    IonSpinner,
    GraphSidebarMenuComponent,
    GraphHeaderbarComponent,
    GraphWorkflowComponent,
    GraphHomeComponent,
    ContainerComponent,
  ],
  providers: [provideNgDiagram()],
  templateUrl: './graph-renderer.component.html',
  styleUrl: './graph-renderer.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class GraphRendererComponent extends NgxGraphDirective implements OnInit {
  readonly sidebarCollapsed = signal(true);
  readonly sidebarWidth = computed(() => (this.sidebarCollapsed() ? '42px' : '240px'));

  graph = model<GraphPublishingWorkflow | string | undefined>();

  // input<GraphPublishingWorkflow | string>.required();
  nodes = input<Model[]>();

  outputs = input<Record<string, unknown>>();

  uid = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('uid'))) || this.route.queryParamMap.pipe(map((p) => p.get('uid')))
  );

  async ngOnInit(): Promise<void> {
    // mock to simulate no graph input
    if (!this.uid()) {
      this.graph.set(undefined);
    }

    if (typeof this.graph() === 'string') {
      this.log.for(this.ngOnInit).debug('Loading graph from string...');
    }
  }

  async handleModeChange(type: string): Promise<void> {
    console.log(type);
  }
}
