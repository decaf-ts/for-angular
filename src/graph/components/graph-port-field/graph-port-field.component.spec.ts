/**
 * @module for-angular/graph/components/graph-port-field/graph-port-field.component.spec
 * @summary IDE-like code input routing contract (DECAF-50 round 2).
 * @description Proves the port field selects the `app-code-editor` only for an input
 * port whose manifest declares `element.tag === 'code-editor'`, falls back to the
 * textarea/input fields otherwise, and emits the edited code with the correct
 * `useAsPort` state.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortDirection } from '@decaf-ts/ui-decorators/graph';

import {
  GraphPortFieldComponent,
  type GraphPortFieldConfig,
} from './graph-port-field.component';

/** Builds a port field config with the given overrides. */
function config(overrides: Partial<GraphPortFieldConfig> = {}): GraphPortFieldConfig {
  return {
    port: {
      property: 'code',
      name: 'code',
      direction: PortDirection.INPUT,
      label: 'Code',
      required: false,
      hidden: false,
    },
    label: 'Code',
    type: 'text',
    value: '',
    useAsPort: false,
    ...overrides,
  };
}

/** Mounts the port field with the given config. */
function render(field: GraphPortFieldConfig): ComponentFixture<GraphPortFieldComponent> {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(GraphPortFieldComponent);
  fixture.componentInstance.field = field;
  fixture.detectChanges();
  return fixture;
}

describe('GraphPortFieldComponent — IDE-like code input routing (DECAF-50 round 2)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('reads the manifest element tag', () => {
    const fixture = render(
      config({
        port: {
          property: 'code',
          name: 'code',
          direction: PortDirection.INPUT,
          label: 'Code',
          required: false,
          hidden: false,
          element: { tag: 'code-editor', props: { name: 'code' } },
        } as GraphPortFieldConfig['port'],
      })
    );

    expect(fixture.componentInstance.elementTag()).toBe('code-editor');
  });

  it('routes a code-editor input port to the code editor in code mode', () => {
    const fixture = render(
      config({
        port: {
          property: 'code',
          name: 'code',
          direction: PortDirection.INPUT,
          label: 'Code',
          required: false,
          hidden: false,
          element: { tag: 'code-editor' },
        } as GraphPortFieldConfig['port'],
      })
    );

    expect(fixture.componentInstance.useCodeEditor()).toBe(true);
    expect(fixture.componentInstance.codeEditorMode()).toBe('code');
    expect(fixture.nativeElement.querySelector('app-code-editor')).not.toBeNull();
  });

  it('does not route a plain input port to the code editor', () => {
    const fixture = render(config());

    expect(fixture.componentInstance.elementTag()).toBe('');
    expect(fixture.componentInstance.useCodeEditor()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-code-editor')).toBeNull();
  });

  it('never routes an output port to the code editor, even with the tag', () => {
    const fixture = render(
      config({
        port: {
          property: 'result',
          name: 'result',
          direction: PortDirection.OUTPUT,
          label: 'Result',
          required: false,
          hidden: false,
          element: { tag: 'code-editor' },
        } as GraphPortFieldConfig['port'],
      })
    );

    // routing is direction-gated, so the tag alone never renders an editor
    expect(fixture.componentInstance.useCodeEditor()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-code-editor')).toBeNull();
  });

  it('reports a formula code-editor tag as formula mode', () => {
    const fixture = render(
      config({
        port: {
          property: 'code',
          name: 'code',
          direction: PortDirection.INPUT,
          label: 'Code',
          required: false,
          hidden: false,
          element: { tag: 'formula-editor' },
        } as GraphPortFieldConfig['port'],
      })
    );

    expect(fixture.componentInstance.useCodeEditor()).toBe(false);
    expect(fixture.componentInstance.codeEditorMode()).toBe('formula');
  });

  it('marks a textarea field type', () => {
    const fixture = render(config({ type: 'textarea' }));
    expect(fixture.componentInstance.isTextarea()).toBe(true);
  });

  it('disables the ball when a direct input value is present and not connected', () => {
    const fixture = render(config({ value: 'const a = 1;' }));

    expect(fixture.componentInstance.ballDisabled()).toBe(true);

    fixture.componentInstance.toggleBall();
    fixture.detectChanges();

    expect(fixture.componentInstance.ballDisabled()).toBe(false);
  });

  it('emits the edited code and current useAsPort on code change', () => {
    const fixture = render(config());
    const emitted: { property: string; value: unknown; useAsPort: boolean }[] = [];
    fixture.componentInstance.fieldChange.subscribe((change) => emitted.push(change));

    fixture.componentInstance.onCodeChange('return $input.text;');

    expect(emitted).toEqual([
      { property: 'code', value: 'return $input.text;', useAsPort: false },
    ]);
  });

  it('seeds the editable value from the field value on init', () => {
    const fixture = render(config({ value: 'return 42;' }));

    expect(fixture.componentInstance._value()).toBe('return 42;');
  });
});
