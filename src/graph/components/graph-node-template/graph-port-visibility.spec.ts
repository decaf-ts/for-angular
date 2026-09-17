/**
 * Gate-2 P0 #2 (D2) — port-visibility rule unit contract.
 *
 * `graphPortVisible` is the single principled visibility rule (DECAF-50
 * §4.22, G3-05..G3-08): a port handle is visible when it is the manifest
 * default port, is connected, is a required input, is value-bound, or is a
 * dynamic (declarative) port; selection/connection reveals every port. The
 * `tests/playwright/graph/port-visibility.spec.ts` suite asserts the same
 * rule on the running demo.
 */
import { PortDirection } from '@decaf-ts/ui-decorators/graph';
import {
  graphPortVisible,
  isGraphDefaultPort,
  isGraphDynamicPort,
} from './graph-node-template.component';

const INPUT = PortDirection.INPUT;
const OUTPUT = PortDirection.OUTPUT;

interface PortShape {
  property: string;
  path?: string;
  required?: boolean;
  element?: unknown;
  direction: PortDirection;
}

function port(overrides: Partial<PortShape> = {}): PortShape {
  return { property: 'data', direction: INPUT, element: { tag: 'input' }, ...overrides };
}

function visible(
  overrides: Partial<PortShape> = {},
  connected: string[] = [],
  modes: Record<string, 'port' | 'value'> = {},
  showAll = false
): boolean {
  return graphPortVisible(port(overrides), new Set(connected), modes, showAll);
}

describe('graphPortVisible — D2 principled visibility rule (G3-05..G3-08)', () => {
  describe('isGraphDefaultPort', () => {
    it('treats the complete-input `value` port as the manifest default', () => {
      expect(isGraphDefaultPort({ property: 'value' })).toBe(true);
      expect(isGraphDefaultPort({ property: 'value', path: 'value' })).toBe(true);
    });

    it('treats the `default` output branch as the manifest default', () => {
      expect(isGraphDefaultPort({ property: 'default' })).toBe(true);
      expect(isGraphDefaultPort({ property: 'branch', path: 'default' })).toBe(true);
    });

    it('does not treat an arbitrary port as the manifest default', () => {
      expect(isGraphDefaultPort({ property: 'data' })).toBe(false);
      expect(isGraphDefaultPort({ property: 'items' })).toBe(false);
    });
  });

  describe('isGraphDynamicPort', () => {
    it('treats a port with no static @uielement as dynamic', () => {
      expect(isGraphDynamicPort({})).toBe(true);
      expect(isGraphDynamicPort({ element: undefined })).toBe(true);
    });

    it('does not treat a @uielement-decorated port as dynamic', () => {
      expect(isGraphDynamicPort({ element: { tag: 'input' } })).toBe(false);
    });
  });

  describe('default ports', () => {
    it('keeps the unconnected `value` input visible', () => {
      expect(visible({ property: 'value' })).toBe(true);
    });

    it('keeps the unconnected `default` output visible', () => {
      expect(visible({ property: 'default', direction: OUTPUT })).toBe(true);
    });
  });

  describe('connected ports', () => {
    it('keeps a connected non-default static port visible', () => {
      expect(visible({ property: 'data' }, ['data'])).toBe(true);
    });

    it('keeps a connected port visible even without a static @uielement', () => {
      expect(visible({ property: 'cases', element: undefined }, ['cases'])).toBe(true);
    });
  });

  describe('required input exception (G3-06)', () => {
    it('keeps a required input visible even when unconnected', () => {
      expect(visible({ property: 'items', required: true })).toBe(true);
      expect(visible({ property: 'slice', required: true })).toBe(true);
    });

    it('does not hide a required input whose binding is absent', () => {
      expect(visible({ property: 'state', required: true }, [], {})).toBe(true);
    });

    it('does not extend the required exception to an output port', () => {
      expect(visible({ property: 'stateOut', required: true, direction: OUTPUT })).toBe(false);
    });
  });

  describe('value-bound ports (G3-07)', () => {
    it('keeps a literal/expression-bound input visible', () => {
      expect(visible({ property: 'count' }, [], { count: 'value' })).toBe(true);
    });
  });

  describe('dynamic ports (G3-08)', () => {
    it('keeps a declaratively generated case port visible', () => {
      expect(visible({ property: 'even', element: undefined })).toBe(true);
    });
  });

  describe('hidden case', () => {
    it('hides only an unconnected, non-required, non-dynamic, non-default static port', () => {
      expect(visible({ property: 'code' })).toBe(false);
    });

    it('ignores the manifest `hidden` CRUD-form flag on the canvas', () => {
      expect(
        visible({ property: 'data', element: undefined, hidden: true } as Partial<PortShape>)
      ).toBe(true);
    });
  });

  describe('selection / connection reveal', () => {
    it('reveals every port while the node is selected or connecting', () => {
      expect(visible({ property: 'code' }, [], {}, true)).toBe(true);
    });
  });
});
