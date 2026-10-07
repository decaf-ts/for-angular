import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonBreadcrumb,
  IonBreadcrumbs,
  IonIcon,
  IonInput,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * One navigable step of the graph workflow breadcrumb trail. The trailing step is
 * the current workflow and is the one that supports in-place renaming (§13).
 */
export interface GraphBreadcrumbStep {
  /** Stable id used for tracking. */
  id: string;
  /** Translation key for the visible label. */
  labelKey: string;
  /** Optional in-app route the step navigates back to. */
  route?: string;
}

/**
 * Graph workflow breadcrumb trail (design spec §13 "Workflow navigation
 * breadcrumbs"): it ends in the current workflow and lets the user rename that
 * workflow in place. The trail reuses the same minimal breadcrumb look as the
 * non-graph pages; the rename affordance only ever applies to the trailing
 * (current) step.
 */
@Component({
  selector: 'app-graph-breadcrumbs',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    IonBreadcrumbs,
    IonBreadcrumb,
    IonIcon,
    IonInput,
  ],
  templateUrl: './graph-breadcrumbs.component.html',
  styleUrl: './graph-breadcrumbs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphBreadcrumbsComponent {
  /** Trail leading up to (but not including) the current workflow. */
  readonly steps = input<GraphBreadcrumbStep[]>([]);
  /** Current workflow display name. */
  readonly workflowName = input<string>('');
  /** Whether the current workflow may be renamed (edit/create modes). */
  readonly renamable = input<boolean>(true);

  /** Emitted with the trimmed new name when the user commits a rename. */
  readonly rename = output<string>();

  /** In-place rename state and draft, bound through the template. */
  editing = false;
  draftName = '';

  @ViewChild('renameInput')
  set renameInputRef(ref: ElementRef<HTMLInputElement> | undefined) {
    if (ref) queueMicrotask(() => ref.nativeElement.focus());
  }

  startRename(): void {
    if (!this.renamable()) return;
    this.draftName = this.workflowName();
    this.editing = true;
  }

  commitRename(): void {
    if (!this.editing) return;
    const nextName = this.draftName.trim();
    this.editing = false;
    if (!nextName || nextName === this.workflowName()) return;
    this.rename.emit(nextName);
  }

  cancelRename(): void {
    this.editing = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.editing) return;
    const target = event.target as HTMLElement | null;
    if (target && target.closest('.graph-breadcrumbs__rename')) return;
    this.cancelRename();
  }
}
