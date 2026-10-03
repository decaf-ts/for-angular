import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { ModelRendererComponent } from 'src/lib/components';
import type { IBaseCustomEvent } from 'src/lib/engine';
import {
  GraphWorkflowFormModel,
  GRAPH_WORKFLOW_PRIVATE_NAMESPACE,
} from 'src/app/models/GraphWorkflowFormModel';

/** Values collected by the first-save workflow create modal. */
export interface GraphWorkflowCreateResult {
  name: string;
  tags?: string;
  category?: string;
  description: string;
  namespace?: string;
}

/**
 * First-save workflow create modal (design spec §13 "Saving & validation"):
 * autosave cannot create a workflow, so the very first save opens this modal.
 * It renders the shared {@link GraphWorkflowFormModel} through the for-angular
 * model renderer, so the create modal and the workflow create page use the exact
 * same components and validation (name required, description required with a
 * minimum length, namespace defaulting to the private user namespace).
 */
@Component({
  selector: 'app-graph-workflow-create-modal',
  standalone: true,
  imports: [
    TranslatePipe,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    ModelRendererComponent,
  ],
  templateUrl: './graph-workflow-create.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphWorkflowCreateModalComponent {
  /** Whether the modal is open. */
  readonly open = input<boolean>(false);
  /** Draft name pre-filled from the workflow document. */
  readonly name = input<string>('');
  /** Namespace applied as the form default (private user namespace). */
  readonly defaultNamespace = input<string>(GRAPH_WORKFLOW_PRIVATE_NAMESPACE);

  /** Emitted with the collected values when the user confirms creation. */
  readonly submitted = output<GraphWorkflowCreateResult>();
  /** Emitted when the user dismisses the modal without creating. */
  readonly cancelled = output<void>();

  /** The form model instance the renderer edits. */
  readonly model = computed(
    () =>
      new GraphWorkflowFormModel({
        name: this.name(),
        namespace: this.defaultNamespace(),
      }),
  );

  /** Globals handed to the renderer (create operation). */
  readonly globals = { operation: OperationKeys.CREATE };

  /**
   * Handles the renderer's submit event: emits the collected values only for a
   * confirm/submit action, ignoring the intermediate field-change events.
   */
  onSubmit(event: IBaseCustomEvent): void {
    const role = event?.role;
    const name = event?.name;
    const isSubmit =
      role === 'confirm' || role === 'submit' || name === 'submit';
    if (!isSubmit) return;
    const data = (event?.data ?? {}) as Partial<GraphWorkflowFormModel>;
    this.submitted.emit({
      name: String(data.name ?? '').trim(),
      tags: data.tags,
      category: data.category,
      description: String(data.description ?? '').trim(),
      namespace: data.namespace,
    });
  }

  onDismiss(): void {
    this.cancelled.emit();
  }
}
