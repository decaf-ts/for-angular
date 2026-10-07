/**
 * @module for-angular/graph/components/graph-condition-editor/graph-condition-editor.component.spec
 * @summary Graphical|code condition editing contract for if/while/until/switch
 * (DECAF-50 §13).
 * @description Proves the condition editor emits the shared
 * `ConditionExpression | CodeCondition` union: the graphical mode builds a
 * `ConditionExpression`, the code mode builds a `CodeCondition` with a
 * `javascript` language, and loading an existing condition restores its mode.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  GraphConditionEditorComponent,
  type GraphConditionEditorChange,
} from './graph-condition-editor.component';

/** Mounts the condition editor, optionally seeded with an existing condition. */
function render(
  condition: GraphConditionEditorChange['condition'] | null = null
): ComponentFixture<GraphConditionEditorComponent> {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(GraphConditionEditorComponent);
  if (condition) {
    fixture.componentInstance.condition = condition;
  }
  fixture.detectChanges();
  return fixture;
}

/** Captures the last condition emitted by the editor. */
function capture(
  fixture: ComponentFixture<GraphConditionEditorComponent>
): { last?: GraphConditionEditorChange } {
  const state: { last?: GraphConditionEditorChange } = {};
  fixture.componentInstance.conditionChange.subscribe((change) => {
    state.last = change;
  });
  return state;
}

function event(value: string): Event {
  return { target: { value } } as unknown as Event;
}

describe('GraphConditionEditorComponent — graphical|code condition (DECAF-50 §13)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('defaults to graphical mode with an invalid empty condition', () => {
    const fixture = render();

    expect(fixture.componentInstance.mode()).toBe('graphical');
    expect(fixture.componentInstance.isValid()).toBe(false);
  });

  it('emits a graphical ConditionExpression', () => {
    const fixture = render();
    const emitted = capture(fixture);

    fixture.componentInstance.onLeftPathChange(event('value'));
    fixture.componentInstance.onOpChange(event('gt'));
    fixture.componentInstance.onRightValueChange(event('10'));

    expect(emitted.last?.condition).toEqual({
      op: 'gt',
      left: { path: 'value' },
      right: { const: 10 },
    });
    expect(emitted.last?.valid).toBe(true);
  });

  it('emits an exists ConditionExpression without a right operand', () => {
    const fixture = render();
    const emitted = capture(fixture);

    fixture.componentInstance.onLeftPathChange(event('value'));
    fixture.componentInstance.onOpChange(event('exists'));

    expect(emitted.last?.condition).toEqual({
      op: 'exists',
      value: { path: 'value' },
    });
    expect(fixture.componentInstance.isExists()).toBe(true);
  });

  it('emits a CodeCondition in code mode', () => {
    const fixture = render();
    const emitted = capture(fixture);

    fixture.componentInstance.setMode('code');
    fixture.componentInstance.onCodeChange('return $input.value > 0;');

    expect(emitted.last?.condition).toEqual({
      type: 'code',
      code: 'return $input.value > 0;',
      language: 'javascript',
    });
    expect(emitted.last?.valid).toBe(true);
  });

  it('treats empty code as invalid', () => {
    const fixture = render();
    const emitted = capture(fixture);

    fixture.componentInstance.setMode('code');
    fixture.componentInstance.onCodeChange('   ');

    expect(emitted.last?.valid).toBe(false);
  });

  it('restores code mode and body from an existing CodeCondition', () => {
    const fixture = render({
      type: 'code',
      code: 'return true;',
      language: 'javascript',
    });

    expect(fixture.componentInstance.mode()).toBe('code');
    expect(fixture.componentInstance.code()).toBe('return true;');
  });

  it('restores graphical mode from an existing ConditionExpression', () => {
    const fixture = render({
      op: 'eq',
      left: { path: 'status' },
      right: { const: 'done' },
    });

    expect(fixture.componentInstance.mode()).toBe('graphical');
    expect(fixture.componentInstance.leftPath()).toBe('status');
    expect(fixture.componentInstance.op()).toBe('eq');
    expect(fixture.componentInstance.rightValue()).toBe('done');
  });

  it('localizes operator labels through the fallback map', () => {
    const fixture = render();
    const labels = fixture.componentInstance.operators.map((operator) => operator.label);

    expect(labels).toContain('greater than (>)');
    expect(labels).toContain('exists (not null/undefined)');
  });
});
