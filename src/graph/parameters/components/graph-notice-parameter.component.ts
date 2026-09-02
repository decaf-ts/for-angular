import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
} from '@angular/core';
import { IonNote } from '@ionic/angular/standalone';
import type {
  GraphJsonValue,
  GraphParameterDefinition,
} from '@decaf-ts/ui-decorators/graph';
import type {
  GraphParameterFormContext,
  GraphParameterRendererContract,
  GraphParameterValueIssue,
} from '../GraphParameterRendererContract';

/**
 * Schema-driven renderer for notice parameters: read-only display text with no value input.
 * Implements {@link GraphParameterRendererContract}.
 */
@Component({
  selector: 'app-graph-notice-parameter',
  standalone: true,
  imports: [IonNote],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-note [color]="noticeColor" class="graph-notice-parameter">{{ noticeContent }}</ion-note>
  `,
})
export class GraphNoticeParameterComponent implements OnChanges, GraphParameterRendererContract {
  @Input({ required: true }) parameter!: GraphParameterDefinition;
  @Input() value: GraphJsonValue | undefined;
  @Input() disabled = false;
  @Input() context: GraphParameterFormContext | undefined;

  @Output() valueChange = new EventEmitter<GraphJsonValue | undefined>();
  @Output() errorChange = new EventEmitter<GraphParameterValueIssue[]>();

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  get noticeContent(): string {
    return (this.parameter as { noticeContent?: string }).noticeContent ?? '';
  }

  get noticeVariant(): string {
    return (this.parameter as { noticeVariant?: string }).noticeVariant ?? 'info';
  }

  get noticeColor(): string {
    switch (this.noticeVariant) {
      case 'warning': return 'warning';
      case 'error': return 'danger';
      case 'success': return 'success';
      default: return 'medium';
    }
  }

  ngOnChanges(): void {
    this.changeDetectorRef.markForCheck();
  }
}
