/**
 * Gate-2 P0 #2 (D2) — port-visibility rule unit contract, refined by G4-R3.
 *
 * `graphPortVisible` is the single principled visibility rule (DECAF-50
 * §4.22, G3-05..G3-08) **as refined by G4-R3**: a port handle is visible
 * when it is the manifest default port, is connected, is a required input, or is a
 * dynamic (declarative) port; selection/connection reveals every port. G4-R3 adds
 * the checkbox/port coupling for inputs: a directly user-provided value
 * (`mode: 'value'`, the unchecked checkbox) renders **no** connectable port,
 * while a checked input (`mode: 'port'`) reveals the port and expects a
 * connection. The `tests/playwright/graph/port-visibility.spec.ts` and
 * `tests/playwright/graph/node-split-code.spec.ts` suites assert the same
 * refined rule on the running demo.
 *
 * FIXED (SAA-1478, G4-R1): the code node ships prefilled with the split
 * code, so its `code` input is value-provided and G4-R1 requires its port to be
 * hidden. `graphPortVisible` now evaluates the value-mode rule before the
 * `required` exception, so a *required* value-provided input renders no
 * connectable handle.
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

  describe('value-bound ports (G3-07, refined by G4-R3)', () => {
    it('hides an unchecked, directly user-provided input port', () => {
      expect(visible({ property: 'count' }, [], { count: 'value' })).toBe(false);
    });

    it('reveals a checked input port even when unconnected', () => {
      expect(visible({ property: 'code' }, [], { code: 'port' })).toBe(true);
    });

    it('hides a directly user-provided input even when it carries a static @uielement', () => {
      expect(visible({ property: 'data' }, [], { data: 'value' })).toBe(false);
    });

    // FIXED (SAA-1478, G4-R1/G4-R3): a required input that already carries
    // a user-provided value renders no connectable port; the value-mode rule
    // takes precedence over the `required` exception.
    it('hides a required input that already carries a user-provided value (G4-R1)', () => {
      expect(visible({ property: 'code', required: true }, [], { code: 'value' })).toBe(false);
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
