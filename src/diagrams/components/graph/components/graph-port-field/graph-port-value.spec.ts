/**
 * @module for-angular/graph/components/graph-port-field/graph-port-value.spec
 * @summary Value-input-mode contract for the node CRUD surfaces (DECAF-50 §4.22,
 * §13 "Value input modes" / "Gating").
 * @description Proves the editor writes the full value-input-mode contract — the
 * `edge`/`literal` bindings plus `expression` bindings and persisted
 * `GraphValueTemplate` parameters — and that the offered modes are gated by the
 * port's own metadata, never hardcoded per node.
 */
import { PortDirection, type GraphPortDefinition } from '@decaf-ts/as-graph/shared';

import {
  graphPortDefaultValueMode,
  graphPortValueBodyOf,
  graphPortValueModeOf,
  graphPortValueModesOf,
  graphPortValuePatchOf,
  graphPortValueTemplateLanguageOf,
  isGraphValueTemplateValue,
} from './graph-port-value';

/** Builds an input port definition with the given overrides. */
function port(overrides: Partial<GraphPortDefinition> = {}): GraphPortDefinition {
  return {
    property: 'value',
    name: 'value',
    label: 'Value',
    direction: PortDirection.INPUT,
    type: 'string',
    required: false,
    hidden: false,
    ...overrides,
  };
}

describe('graph-port-value — value input modes (DECAF-50 §4.22, §13)', () => {
  describe('gating', () => {
    it('offers only port/literal for a plain input', () => {
      expect(graphPortValueModesOf(port())).toEqual(['port', 'literal']);
    });

    it('adds expression/template/formula for a code-capable input', () => {
      expect(graphPortValueModesOf(port({ type: 'code' }))).toEqual([
        'port',
        'literal',
        'expression',
        'template',
        'formula',
      ]);
      expect(graphPortValueModesOf(port({ element: { tag: 'code-editor' } }))).toContain(
        'expression'
      );
    });

    it('never exposes value modes for an output port', () => {
      expect(graphPortValueModesOf(port({ direction: PortDirection.OUTPUT }))).toEqual([
        'literal',
      ]);
    });

    it('defaults a code port to expression, a delegated port to edge, else literal', () => {
      expect(graphPortDefaultValueMode(port({ type: 'code' }))).toBe('expression');
      expect(
        graphPortDefaultValueMode(port({ graph: { direction: PortDirection.INPUT, userControlled: true } }))
      ).toBe('port');
      expect(graphPortDefaultValueMode(port())).toBe('literal');
    });
  });

  describe('persisted template language', () => {
    it('maps template mode to text and expression to javascript', () => {
      expect(graphPortValueTemplateLanguageOf('template', port())).toBe('text');
      expect(graphPortValueTemplateLanguageOf('expression', port())).toBe('javascript');
      expect(graphPortValueTemplateLanguageOf('expression', port({ type: 'typescript' }))).toBe(
        'typescript'
      );
    });
  });

  describe('document patch', () => {
    it('writes an edge binding for port mode', () => {
      expect(graphPortValuePatchOf(port(), 'port', 'ignored')).toEqual({
        binding: { mode: 'edge' },
      });
    });

    it('writes a literal binding for literal mode', () => {
      expect(graphPortValuePatchOf(port(), 'literal', 'hello')).toEqual({
        binding: { mode: 'literal', value: 'hello' },
      });
    });

    it('writes an expression binding and a persisted template', () => {
      const patch = graphPortValuePatchOf(port({ type: 'code' }), 'expression', 'return $input.value;');

      expect(patch.binding).toEqual({
        mode: 'expression',
        expression: 'return $input.value;',
      });
      expect(patch.template).toEqual({
        mode: 'expression',
        expression: 'return $input.value;',
        language: 'javascript',
      });
    });

    it('writes only a template for templated-string mode', () => {
      const patch = graphPortValuePatchOf(port({ type: 'code' }), 'template', 'Hello {{ $input.name }}');

      expect(patch.binding).toBeUndefined();
      expect(patch.template).toEqual({
        mode: 'template',
        expression: 'Hello {{ $input.name }}',
        language: 'text',
      });
    });

    it('persists a formula as an expression template carrying the formula marker', () => {
      const patch = graphPortValuePatchOf(port({ type: 'code' }), 'formula', '$input.a + 1');

      expect(patch.template).toEqual({
        mode: 'expression',
        expression: '$input.a + 1',
        language: 'javascript',
        metadata: { formula: 'true' },
      });
    });
  });

  describe('seeding from the document', () => {
    it('resolves the mode from a persisted template over the binding', () => {
      const template = { mode: 'template', expression: 'Hi {{ $input.x }}', language: 'text' };
      expect(graphPortValueModeOf(port(), undefined, template)).toBe('template');
    });

    it('resolves a formula template back to formula mode', () => {
      const template = {
        mode: 'expression',
        expression: 'a + 1',
        language: 'javascript',
        metadata: { formula: 'true' },
      };
      expect(graphPortValueModeOf(port(), undefined, template)).toBe('formula');
    });

    it('resolves the mode from an edge/expression/literal binding', () => {
      expect(graphPortValueModeOf(port(), { mode: 'edge' }, undefined)).toBe('port');
      expect(graphPortValueModeOf(port(), { mode: 'expression', expression: 'x' }, undefined)).toBe(
        'expression'
      );
      expect(graphPortValueModeOf(port(), { mode: 'literal', value: 1 }, undefined)).toBe('literal');
    });

    it('reads the editable body from the template or binding', () => {
      expect(
        graphPortValueBodyOf(undefined, {
          mode: 'template',
          expression: 'Hi {{ $input.x }}',
          language: 'text',
        })
      ).toBe('Hi {{ $input.x }}');
      expect(graphPortValueBodyOf({ mode: 'literal', value: 'abc' }, undefined)).toBe('abc');
      expect(graphPortValueBodyOf({ mode: 'edge' }, undefined)).toBe('');
    });

    it('recognizes a persisted template value', () => {
      expect(isGraphValueTemplateValue({ mode: 'expression', expression: 'x' })).toBe(true);
      expect(isGraphValueTemplateValue({ mode: 'literal', value: 'x' })).toBe(false);
      expect(isGraphValueTemplateValue(undefined)).toBe(false);
    });
  });
});
