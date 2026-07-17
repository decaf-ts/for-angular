import { Component, computed, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import type {
  CodeCondition,
  ConditionExpression,
  ExprValue,
  SwitchCaseCondition,
} from '@decaf-ts/integrations/graph/shared';
import { IonInput, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { CodeEditorComponent } from '../code-editor/code-editor.component';

export type ConditionMode = 'graphical' | 'code';

export interface GraphConditionEditorChange {
  condition: SwitchCaseCondition;
  valid: boolean;
}

const OPERATORS = [
  { op: 'eq', label: 'equals (==)' },
  { op: 'neq', label: 'not equals (!=)' },
  { op: 'gt', label: 'greater than (>)' },
  { op: 'gte', label: 'greater or equal (>=)' },
  { op: 'lt', label: 'less than (<)' },
  { op: 'lte', label: 'less or equal (<=)' },
  { op: 'exists', label: 'exists (not null/undefined)' },
] as const;

@Component({
  selector: 'app-graph-condition-editor',
  standalone: true,
  imports: [IonSelect, IonSelectOption, IonInput, CodeEditorComponent],
  templateUrl: './graph-condition-editor.component.html',
  styleUrl: './graph-condition-editor.component.scss',
})
export class GraphConditionEditorComponent implements OnInit {
  @Input() inputProperties: string[] = [];
  @Input() condition: SwitchCaseCondition | null = null;

  readonly _mode = signal<ConditionMode>('graphical');
  readonly _leftPath = signal('');
  readonly _op = signal<ConditionExpression['op']>('eq');
  readonly _rightValue = signal('');
  readonly _code = signal('');

  readonly mode = this._mode.asReadonly();
  readonly leftPath = this._leftPath.asReadonly();
  readonly op = this._op.asReadonly();
  readonly rightValue = this._rightValue.asReadonly();
  readonly code = this._code.asReadonly();

  readonly operators = OPERATORS;
  readonly placeholderHelp =
    'Supports placeholders like {{ $input.foo }}, {{ $node["Name"].output }}, {{ $vars.bar }}. Must return a boolean. Same restrictions as the Code Node apply.';
  readonly isExists = computed(() => this._op() === 'exists');
  readonly isValid = computed(() => {
    if (this._mode() === 'code') {
      return this._code().trim().length > 0;
    }
    if (this.isExists()) {
      return this._leftPath().length > 0;
    }
    return this._leftPath().length > 0 && this._rightValue().length > 0;
  });

  @Output() conditionChange = new EventEmitter<GraphConditionEditorChange>();

  ngOnInit() {
    if (this.condition) {
      this.loadCondition(this.condition);
    }
  }

  setMode(mode: ConditionMode) {
    this._mode.set(mode);
    this.emit();
  }

  onLeftPathChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this._leftPath.set(target.value);
    this.emit();
  }

  onOpChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this._op.set(target.value as ConditionExpression['op']);
    this.emit();
  }

  onRightValueChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this._rightValue.set(target.value);
    this.emit();
  }

  onCodeChange(value: string) {
    this._code.set(value);
    this.emit();
  }

  private loadCondition(cond: SwitchCaseCondition) {
    if ('type' in cond && cond.type === 'code') {
      this._mode.set('code');
      this._code.set((cond as CodeCondition).code);
      return;
    }
    if ('op' in cond) {
      this._mode.set('graphical');
      const expr = cond as ConditionExpression;
      this._op.set(expr.op);
      if ('left' in expr && 'path' in expr.left) {
        this._leftPath.set((expr.left as ExprValue & { path: string }).path);
      }
      if ('right' in expr && 'const' in expr.right) {
        this._rightValue.set(String((expr.right as ExprValue & { const: unknown }).const));
      }
    }
  }

  private emit() {
    const condition = this.buildCondition();
    this.conditionChange.emit({ condition, valid: this.isValid() });
  }

  private buildCondition(): SwitchCaseCondition {
    if (this._mode() === 'code') {
      const codeCond: CodeCondition = {
        type: 'code',
        code: this._code(),
        language: 'javascript',
      };
      return codeCond;
    }

    const op = this._op();
    const leftPath = this._leftPath();

    if (op === 'exists') {
      const expr = {
        op: 'exists' as const,
        value: { path: leftPath },
      };
      return expr;
    }

    let rightConst: unknown = this._rightValue();
    const numVal = Number(rightConst);
    if (!isNaN(numVal) && String(rightConst).trim() !== '') {
      rightConst = numVal;
    }

    const expr = {
      op,
      left: { path: leftPath },
      right: { const: rightConst },
    } as ConditionExpression;
    return expr;
  }
}
