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
import type { GraphJsonValue, GraphParameterDefinition } from '@decaf-ts/ui-decorators/graph';
import { CodeEditorComponent, type CodeEditorMode } from '../../components/code-editor/code-editor.component';
import type {
  GraphParameterFormContext,
  GraphParameterRendererContract,
  GraphParameterValueIssue,
} from '../GraphParameterRendererContract';

/**
 * Schema-driven renderer for `code` parameters: a code textarea with change/error emission.
 * Implements {@link GraphParameterRendererContract}.
 */
@Component({
  selector: 'app-graph-code-parameter',
  standalone: true,
  imports: [CodeEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-code-editor
      [mode]="mode"
      [code]="codeValue"
      [placeholder]="placeholder"
      (codeChange)="onCodeChange($event)"
    ></app-code-editor>
  `,
})
export class GraphCodeParameterComponent implements OnChanges, GraphParameterRendererContract {
  @Input({ required: true }) parameter!: GraphParameterDefinition;
  @Input() value: GraphJsonValue | undefined;
  @Input() disabled = false;
  @Input() context: GraphParameterFormContext | undefined;

  @Output() valueChange = new EventEmitter<GraphJsonValue | undefined>();
  @Output() errorChange = new EventEmitter<GraphParameterValueIssue[]>();

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  get placeholder(): string {
    return (
      this.codeParameter?.placeholder ??
      '// code runs backend-side; values are parameters, never manifest methods'
    );
  }

  private get codeParameter(): Extract<GraphParameterDefinition, { type: 'code' }> {
    return this.parameter as Extract<GraphParameterDefinition, { type: 'code' }>;
  }

  readonly mode: CodeEditorMode = 'code';

  get codeValue(): string {
    return typeof this.value === 'string' ? this.value : '';
  }

  ngOnChanges(): void {
    this.changeDetectorRef.markForCheck();
  }

  onCodeChange(code: string): void {
    this.changeDetectorRef.markForCheck();
    this.valueChange.emit(code === '' ? undefined : code);
  }
}
