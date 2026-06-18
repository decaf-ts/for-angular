import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { GraphRendererComponent, GraphPublishingWorkflow } from 'src/graph';

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [
    IonContent,
    ContainerComponent,
    GraphRendererComponent,
  ],
  templateUrl: './graph.page.html',
  styleUrl: './graph.page.scss',
})
export class GraphPage {
  readonly workflowRoot = GraphPublishingWorkflow;
}
