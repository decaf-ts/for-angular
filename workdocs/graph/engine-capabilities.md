# Capability-Driven Engine UI in Angular

Toggle engine-specific affordances and browse remote engine workflows from the served engine capability manifest.

The manifest is the same shape the as-graph NestJS server serves at `GET /graph/engines` (`{ engines: [...], defaultEngineId }`, with per-engine `capabilities: [{ feature, verdict }]` rows). The UI reads no environment flags and no build-time constants for these decisions — only the server-served manifest.

## GraphEngineCapabilityService

The `GraphEngineCapabilityService` is a root `@Injectable()` that wraps the manifest store and exposes Angular signals:

```typescript
import { GraphEngineCapabilityService } from "@decaf-ts/for-angular/graph";

export class GraphToolbar {
  readonly capabilities = inject(GraphEngineCapabilityService);

  readonly engines = this.capabilities.engines;             // GraphEngineDescriptor[]
  readonly selectedEngine = this.capabilities.selectedEngine;
  readonly engineLabel = this.capabilities.engineLabel;     // displayName of the selected engine
  readonly canSelectEngine = this.capabilities.canSelectEngine;
  readonly canBrowseWorkflows = this.capabilities.canBrowseWorkflows;  // workflowList SUPPORTED
  readonly canLookupWorkflow = this.capabilities.canLookupWorkflow;    // workflowLookup SUPPORTED
  readonly capabilityChips = this.capabilities.capabilityChips;        // SUPPORTED feature names
  readonly status = this.capabilities.status; // "unloaded" | "loading" | "ready" | "degraded" | "failed"

  async ngOnInit() {
    await this.capabilities.load(); // fetches the manifest once; refresh() re-fetches
  }
}
```

Feature checks are verdict-driven and fail closed: `supports(...aliases)` is `true` only when the selected engine declares the matching feature `SUPPORTED`. `NOT_SUPPORTED`, `EXTENSION_POINT`, and undeclared features are all denied, so a partially supported capability never advertises a usable toggle. Alias matching is inclusive-substring over normalized feature names, so `supports("workflowList")` also matches a `workflow_list` spelling.

Toggle buttons and panels off these signals — never off `platform` checks or hardcoded engine lists:

```html
@if (canBrowseWorkflows()) {
  <ion-button (click)="browse()">Browse workflows</ion-button>
}
```

## Wiring the source

The service reads the manifest through the `GRAPH_ENGINE_CAPABILITY_SOURCE` injection token. The shipped `GraphEngineCapabilityApi` implements it against the same backend URL the graph execution service uses (credential-including `fetch` with a 10 s timeout), mapping HTTP failures onto Decaf errors (`BadRequestError`, `AuthorizationError`, `ForbiddenError`, `NotFoundError`, `InternalError`). Provide it in your app config:

```typescript
import {
  GRAPH_ENGINE_CAPABILITY_SOURCE,
  GraphEngineCapabilityApi,
} from "@decaf-ts/for-angular/graph";

export const AppConfig: ApplicationConfig = {
  providers: [
    { provide: GRAPH_ENGINE_CAPABILITY_SOURCE, useExisting: GraphEngineCapabilityApi },
  ],
};
```

Without a provided source, capability calls throw `GraphEngineCapabilityUnavailableError` instead of silently degrading.

## Workflow browse/select flow

`GraphEngineWorkflowPickerComponent` (selector `app-graph-engine-workflow-picker`, standalone) owns the workflow-catalogue UX: an engine selector (shown when more than one engine is advertised), a workflow list, and a Run action per workflow. It only lists workflows when the selected engine declares `workflowList` `SUPPORTED`, and it resolves each document through `workflowLookup`:

```typescript
import {
  GraphEngineWorkflowPickerComponent,
  type GraphEngineWorkflowSelection,
} from "@decaf-ts/for-angular/graph";

@Component({
  standalone: true,
  imports: [GraphEngineWorkflowPickerComponent],
  template: `
    <app-graph-engine-workflow-picker
      #picker
      [open]="open()"
      (workflowSelected)="onSelected($event)"
      (dismiss)="open.set(false)"
    />
  `,
})
export class WorkflowBrowser {
  readonly open = signal(false);
  readonly picker = viewChild.required(GraphEngineWorkflowPickerComponent);

  browse() {
    this.open.set(true);
    void this.picker().openAndLoad(); // loads the manifest, then the workflow list
  }

  async onSelected(selection: GraphEngineWorkflowSelection) {
    // selection.engineId / selection.summary / selection.document (canonical document)
  }
}
```

Selecting a workflow emits `GraphEngineWorkflowSelection` (`engineId`, `summary`, `document`) once the canonical `GraphWorkflowDocument` has been resolved; the demo graph page restores it into the editor and runs it through the normal run path. If the backend is unreachable the store transitions to `degraded`/`failed` (with a `backend-down` or `malformed-response` failure) and the picker stays usable once the manifest loads again — an engine that does not support the catalogue simply shows no workflow affordances.
