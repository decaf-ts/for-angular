import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { InternalError, NotFoundError } from '@decaf-ts/db-decorators';
import type { GraphJsonValue } from '@decaf-ts/as-graph/shared';
import {
  GRAPH_NODE_MANIFEST_FIXTURES,
  GRAPH_DEV_MODE,
  GRAPH_NODE_CATALOG_SOURCE,
  GraphNodeCatalogService,
  GraphNodeCatalogStore,
  GraphRendererComponent,
  GraphWorkflowDocumentStore,
  GraphWorkflowValidateClient,
  resolveGraphNodeManifest,
  type GraphNodeCatalogSource,
} from '@decaf-ts/for-angular/diagrams';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/lib/components';
import { DiagramPreviewWorkflow } from './diagram-preview.workflow';

const MANIFESTS = GRAPH_NODE_MANIFEST_FIXTURES;

function manifestOf(kind: string) {
  return MANIFESTS.find((manifest) => manifest.kind === kind);
}

const FIXTURE_CATALOG_SOURCE: GraphNodeCatalogSource = {
  async fetchManifests() {
    return MANIFESTS;
  },
  async fetchManifest(kind: string) {
    return manifestOf(kind);
  },
  async resolveManifest(
    kind: string,
    instance: { parameters?: Record<string, GraphJsonValue> }
  ) {
    const manifest = manifestOf(kind);
    if (!manifest) {
      throw new NotFoundError(
        `Node kind '${kind}' is not registered in the preview catalogue.`
      );
    }
    return resolveGraphNodeManifest(
      manifest,
      (instance.parameters ?? {}) as Record<string, GraphJsonValue>
    );
  },
  async invokeMethod(kind: string, method: string) {
    throw new InternalError(
      `Node method '${method}' on '${kind}' is not available in the diagrams preview.`
    );
  },
};

/**
 * `/diagrams` demo page: renders the fixture-backed two-node
 * `DiagramPreviewWorkflow` through `GraphRendererComponent`, supplying an
 * in-memory node catalogue and a no-op validation client so the canvas can be
 * inspected without a graph backend.
 *
 * @category Demo Pages
 */
@Component({
  selector: 'app-diagrams-page',
  imports: [
    IonContent,
    HeaderComponent,
    ContainerComponent,
    TranslatePipe,
    GraphRendererComponent,
  ],
  providers: [
    GraphWorkflowDocumentStore,
    GraphNodeCatalogStore,
    GraphNodeCatalogService,
    { provide: GRAPH_NODE_CATALOG_SOURCE, useValue: FIXTURE_CATALOG_SOURCE },
    {
      provide: GraphWorkflowValidateClient,
      useValue: {
        async validate() {
          return { valid: true, issues: [] };
        },
      },
    },
    { provide: GRAPH_DEV_MODE, useValue: false },
  ],
  templateUrl: './diagrams.page.html',
  styleUrl: './diagrams.page.scss',
})
export class DiagramsPage implements OnInit, AfterViewInit {
  @ViewChild(GraphRendererComponent)
  private renderer?: GraphRendererComponent;

  protected readonly workflowRoot = DiagramPreviewWorkflow;

  protected readonly manifests = MANIFESTS;

  protected readonly nodeCount = 2;

  protected readonly edgeCount = 1;

  private readonly catalogService = inject(GraphNodeCatalogService);

  async ngOnInit(): Promise<void> {
    await this.catalogService.load();
  }

  ngAfterViewInit(): void {
    this.renderer?.toggleInputsPanel();
    this.renderer?.toggleOutputsPanel();
  }
}
