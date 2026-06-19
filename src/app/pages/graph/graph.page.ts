import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { GraphRendererComponent } from 'src/graph';
import { GraphPublishingWorkflow } from './workflow-root';

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [
    IonContent,
    GraphRendererComponent,
  ],
  templateUrl: './graph.page.html',
  styleUrl: './graph.page.scss',
})
export class GraphPage {
  readonly workflowRoot = GraphPublishingWorkflow;
}
