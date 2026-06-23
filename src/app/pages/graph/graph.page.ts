import { Component, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { GraphRendererComponent } from 'src/graph';
import { NgxPageDirective } from 'src/lib/engine';
import { GraphPublishingWorkflow } from './workflow-root';

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [IonContent, GraphRendererComponent],
  templateUrl: './graph.page.html',
  styleUrl: './graph.page.scss',
})
export class GraphPage extends NgxPageDirective implements OnInit {
  readonly workflowRoot = GraphPublishingWorkflow;

  constructor() {
    super('GraphPage', false);
  }

  async ngOnInit(): Promise<void> {}
}
