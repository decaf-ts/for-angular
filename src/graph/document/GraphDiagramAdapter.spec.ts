/**
 * Gate-2 P0 #1 (D1) — manifest-authoritative geometry precedence.
 *
 * `nodeUiSizeOf`/`projectedNodeHeightOf` are the single projection point for
 * node geometry. These tests pin the D1 contract: manifest `display` wins over
 * template CSS and over a carried `ui.size`; an instance `ui.size` is honoured
 * only as an explicit user resize; and content-driven growth is evaluated from
 * the manifest's declared, value-driven display rules — never a hardcoded formula.
 */
import type {
  GraphNodeInstance,
  GraphResolvedNodeManifest,
} from '@decaf-ts/ui-decorators/graph';
import { nodeUiSizeOf, projectedNodeHeightOf } from './GraphDiagramAdapter';

function nodeOf(overrides: Partial<GraphNodeInstance> = {}): GraphNodeInstance {
  return {
    id: 'node-1',
    kind: 'core.flow.switch',
    parameters: {},
    ...overrides,
  } as GraphNodeInstance;
}

function resolvedOf(display: Record<string, unknown>): GraphResolvedNodeManifest {
  return {
    kind: 'core.flow.switch',
    display,
    inputs: [],
    outputs: [],
    parameters: [],
  } as unknown as GraphResolvedNodeManifest;
}

describe('GraphDiagramAdapter — manifest-authoritative geometry (D1/G3-01..03)', () => {
  it('uses the manifest display size and ignores a carried ui.size (no explicit resize)', () => {
    const node = nodeOf({ ui: { position: { x: 0, y: 0 }, size: { width: 50, height: 50 } } });
    const resolved = resolvedOf({ name: 'Switch', width: 120, height: 140 });

    expect(nodeUiSizeOf(node, resolved)).toEqual({ width: 120, height: 140 });
  });

  it('honours ui.size only as an explicit user resize', () => {
    const node = nodeOf({
      ui: { position: { x: 0, y: 0 }, size: { width: 50, height: 60 }, resized: true },
    });
    const resolved = resolvedOf({ name: 'Switch', width: 120, height: 140 });

    expect(nodeUiSizeOf(node, resolved)).toEqual({ width: 50, height: 60 });
  });

  it('falls back to the default size when the manifest declares no geometry', () => {
    const node = nodeOf();
    const resolved = resolvedOf({ name: 'Switch' });

    expect(nodeUiSizeOf(node, resolved)).toEqual({ width: 96, height: 96 });
  });

  it('evaluates content-driven height from the manifest size rule (G3-03)', () => {
    const node = nodeOf({ parameters: { cases: [{}, {}, {}] } });
    const resolved = resolvedOf({
      name: 'Switch',
      width: 120,
      height: 140,
      sizeRules: [
        { type: 'parameterCount', parameter: 'cases', dimension: 'height', perItem: 24 },
      ],
    });

    expect(nodeUiSizeOf(node, resolved)).toEqual({ width: 120, height: 212 });
    expect(projectedNodeHeightOf(node, resolved, 140)).toBe(212);
  });

  it('never applies a hardcoded switch formula without a manifest rule (G3-03)', () => {
    const node = nodeOf({ parameters: { cases: [{}, {}, {}, {}] } });
    const resolved = resolvedOf({ name: 'Switch', width: 120, height: 140 });

    expect(projectedNodeHeightOf(node, resolved, 140)).toBe(140);
  });
});
