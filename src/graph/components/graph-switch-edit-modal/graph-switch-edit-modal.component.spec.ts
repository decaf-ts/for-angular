/**
 * @module for-angular/graph/components/graph-switch-edit-modal/graph-switch-edit-modal.component.spec
 * @summary Config-driven switch dynamic-cases CRUD contract (DECAF-50 §13 gap 3).
 * @description Proves the switch modal's dynamic cases are fully config-driven:
 * add/remove/rename cases, per-case graphical OR code condition, drag reorder,
 * and the default-port fallback all round-trip through the modal result.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';
import type { SwitchCase } from '@decaf-ts/as-graph/shared';

import {
  GraphSwitchEditModalComponent,
  type GraphSwitchEditResult,
} from './graph-switch-edit-modal.component';

/** Seed metadata accepted by the switch modal. */
interface SwitchMetadataFixture {
  cases: SwitchCase[];
  defaultPort: string;
  hasDefault?: boolean;
}

/** Mounts the switch modal, optionally seeded with initial metadata. */
function render(
  initialSwitchMetadata: SwitchMetadataFixture = { cases: [], defaultPort: 'default' }
): {
  fixture: ComponentFixture<GraphSwitchEditModalComponent>;
  dismiss: jest.Mock;
} {
  const dismiss = jest.fn();
  TestBed.configureTestingModule({
    providers: [{ provide: ModalController, useValue: { dismiss } }],
  });
  const fixture = TestBed.createComponent(GraphSwitchEditModalComponent);
  fixture.componentRef.setInput('nodeId', 'switch-1');
  fixture.componentRef.setInput('nodeTitle', 'Switch');
  fixture.componentRef.setInput('inputProperties', ['value']);
  fixture.componentRef.setInput('initialSwitchMetadata', initialSwitchMetadata);
  fixture.detectChanges();
  return { fixture, dismiss };
}

/** Returns the `GraphSwitchEditResult` the modal dismissed with. */
function savedResult(dismiss: jest.Mock): GraphSwitchEditResult {
  expect(dismiss).toHaveBeenCalledTimes(1);
  return dismiss.mock.calls[0][0] as GraphSwitchEditResult;
}

function checked(checkedValue: boolean): Event {
  return { target: { checked: checkedValue } } as unknown as Event;
}

describe('GraphSwitchEditModalComponent — dynamic-cases CRUD (DECAF-50 §13)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('adds a case with a default graphical condition and output port', () => {
    const { fixture } = render();

    fixture.componentInstance.addCase();

    const [added] = fixture.componentInstance.cases();
    expect(added.outputPort).toBe('case_1');
    expect(added.condition).toEqual({ op: 'eq', left: { path: '' }, right: { const: '' } });
    expect(fixture.componentInstance.outputPorts()).toEqual(['case_1']);
  });

  it('removes a case', () => {
    const { fixture } = render();

    fixture.componentInstance.addCase();
    const [added] = fixture.componentInstance.cases();
    fixture.componentInstance.removeCase(added.id);

    expect(fixture.componentInstance.cases()).toEqual([]);
  });

  it('renames a case and re-derives its output port', () => {
    const { fixture } = render();
    fixture.componentInstance.addCase();
    const [added] = fixture.componentInstance.cases();

    fixture.componentInstance.onCaseLabelChange(added.id, {
      target: { value: 'Order Paid!' },
    } as unknown as Event);

    expect(fixture.componentInstance.cases()[0].label).toBe('Order Paid!');
    expect(fixture.componentInstance.cases()[0].outputPort).toBe('order_paid');
  });

  it('writes a code-mode per-case condition', () => {
    const { fixture, dismiss } = render();
    fixture.componentInstance.addCase();
    const [added] = fixture.componentInstance.cases();

    fixture.componentInstance.onConditionChange(added.id, {
      condition: { type: 'code', code: 'return $input.total > 100;', language: 'javascript' },
      valid: true,
    });
    fixture.componentInstance.save();

    const result = savedResult(dismiss);
    expect(result.switchMetadata.cases[0].condition).toEqual({
      type: 'code',
      code: 'return $input.total > 100;',
      language: 'javascript',
    });
  });

  it('reorders cases by drag and drop', () => {
    const { fixture } = render();
    fixture.componentInstance.addCase();
    fixture.componentInstance.addCase();
    fixture.componentInstance.addCase();
    const [first, second, third] = fixture.componentInstance.cases();

    fixture.componentInstance.onDragStart(third.id, {
      dataTransfer: { setData: jest.fn(), effectAllowed: '' },
    } as unknown as DragEvent);
    fixture.componentInstance.onDrop(0, {
      preventDefault: jest.fn(),
    } as unknown as DragEvent);

    expect(fixture.componentInstance.cases().map((item) => item.id)).toEqual([
      third.id,
      first.id,
      second.id,
    ]);
  });

  it('round-trips the default port and default-node flag on save', () => {
    const { fixture, dismiss } = render();

    fixture.componentInstance.addCase();
    fixture.componentInstance.onHasDefaultChange(checked(true));
    fixture.componentInstance.save();

    const result = savedResult(dismiss);
    expect(result.switchMetadata.hasDefault).toBe(true);
    expect(result.switchMetadata.defaultPort).toBe('default');
    expect(result.autoCreateDefaultNode).toBe(true);
    expect(result.outputSplits).toEqual([]);
  });

  it('seeds cases from the initial metadata', () => {
    const { fixture } = render({
      cases: [
        {
          id: 'c1',
          label: 'Paid',
          condition: { op: 'eq', left: { path: 'status' }, right: { const: 'paid' } },
          outputPort: 'paid',
        },
      ],
      defaultPort: 'fallback',
      hasDefault: true,
    });

    expect(fixture.componentInstance.cases()).toHaveLength(1);
    expect(fixture.componentInstance.hasDefault()).toBe(true);
    expect(fixture.componentInstance.outputPorts()).toEqual(['paid', 'fallback']);
  });
});
