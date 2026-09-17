/**
 * Gate-2 P0 #2 (D2) — workflow-boundary projection unit contract.
 *
 * The boundary decision (D2/G3-09) renders the workflow boundary as real
 * trigger/result ports: the input badge carries the `value` output handle, the
 * output badge carries the `value` input handle, and workflow-output edges are
 * projected instead of dropped. These tests pin the projection contract that
 * `tests/playwright/graph/port-visibility.spec.ts` asserts on the running demo.
 */
import type {
  GraphNodeInstance,
  GraphNodeManifest,
  GraphPortManifest,
  GraphResolvedNodeManifest,
  GraphWorkflowDocument,
} from '@decaf-ts/ui-decorators/graph';
import { PortDirection } from '@decaf-ts/ui-decorators/graph';
import { graphWorkflowDocumentCanvasModelOf } from './GraphDiagramAdapter';
import type { GraphNodeManifestReader } from '../catalog/GraphNodeCatalogReader';

const INPUT = PortDirection.INPUT;
const OUTPUT = PortDirection.OUTPUT;

function codeResolved(): GraphResolvedNodeManifest {
  return {
    kind: 'core.flow.code',
    display: { name: 'Code', category: 'Utility', width: 96, height: 96 },
    inputs: [
      { id: 'data', label: 'Data', direction: 'input', required: false, hidden: true },
      { id: 'code', label: 'Code', direction: 'input', required: true },
    ],
    outputs: [{ id: 'result', label: 'Result', direction: 'output', required: true }],
    parameters: [],
  };
}

function logResolved(): GraphResolvedNodeManifest {
  return {
    kind: 'core.flow.log',
    display: { name: 'Log', category: 'Utility', width: 96, height: 96 },
    inputs: [{ id: 'value', label: 'Input value', direction: 'input', required: true }],
    outputs: [{ id: 'logged', label: 'Logged value', direction: 'output', required: true }],
    parameters: [],
  };
}

function readerOf(resolved: GraphResolvedNodeManifest[]): GraphNodeManifestReader {
  const byKind = new Map(resolved.map((manifest) => [manifest.kind, manifest]));
  return {
    all: () => resolved.map((manifest) => ({ kind: manifest.kind } as GraphNodeManifest)),
    get: (kind: string) =>
      byKind.has(kind) ? ({ kind } as GraphNodeManifest) : undefined,
    resolve: (instance: GraphNodeInstance) => {
      const found = byKind.get(instance.kind);
      if (!found) throw new Error(`unknown kind '${instance.kind}'`);
      return found;
    },
  };
}

function demoDocument(): GraphWorkflowDocument {
  return {
    id: 'text-pipeline',
    name: 'Text pipeline',
    inputs: [
      { id: 'count', label: 'count' },
      { id: 'text', label: 'text' },
    ],
    outputs: [{ id: 'result', label: 'result' }],
    nodes: [
      { id: 'SplitTextCodeNode', kind: 'core.flow.code', label: 'Split', parameters: {} },
      { id: 'ResultLogNode', kind: 'core.flow.log', label: 'Log Results', parameters: {} },
    ],
    edges: [
      {
        id: 'e-count',
        type: 'data',
        source: { scope: 'workflow', port: 'count' },
        target: { scope: 'node', nodeId: 'SplitTextCodeNode', port: 'data' },
        label: 'count',
      },
      {
        id: 'e-text',
        type: 'data',
        source: { scope: 'workflow', port: 'text' },
        target: { scope: 'node', nodeId: 'SplitTextCodeNode', port: 'data' },
        label: 'text',
      },
      {
        id: 'e-result',
        type: 'data',
        source: { scope: 'node', nodeId: 'SplitTextCodeNode', port: 'result' },
        target: { scope: 'node', nodeId: 'ResultLogNode', port: 'value' },
        label: 'lines',
      },
      {
        id: 'e-final',
        type: 'data',
        source: { scope: 'node', nodeId: 'ResultLogNode', port: 'logged' },
        target: { scope: 'workflow', port: 'result' },
        label: 'final-result',
      },
    ],
  };
}

function portOf(manifest: GraphResolvedNodeManifest, id: string): GraphPortManifest {
  const port = [...manifest.inputs, ...manifest.outputs].find((candidate) => candidate.id === id);
  if (!port) throw new Error(`port '${id}' not found`);
  return port;
}

describe('graphWorkflowDocumentCanvasModelOf — workflow boundary (D2/G3-09)', () => {
  it('projects an output-boundary badge per workflow output port', () => {
    const projection = graphWorkflowDocumentCanvasModelOf(
      demoDocument(),
      readerOf([codeResolved(), logResolved()])
    );

    expect(projection.nodeIds).toContain('output-result');
    expect(projection.boundaryNodeIds).toContain('output-result');
    const badge = projection.nodes.find((node) => node.id === 'output-result');
    expect((badge?.data as unknown as { role: string })?.role).toBe('output');
  });

  it('gives the output badge a real `value` input port', () => {
    const projection = graphWorkflowDocumentCanvasModelOf(
      demoDocument(),
      readerOf([codeResolved(), logResolved()])
    );

    const badge = projection.nodes.find((node) => node.id === 'output-result');
    const ports = (badge?.data as { ports: { property: string; direction: PortDirection }[] }).ports;
    const value = ports.find((port) => port.property === 'value');
    expect(value).toBeDefined();
    expect(value?.direction).toBe(INPUT);
  });

  it('keeps the input badge real `value` output port', () => {
    const projection = graphWorkflowDocumentCanvasModelOf(
      demoDocument(),
      readerOf([codeResolved(), logResolved()])
    );

    for (const id of ['input-count', 'input-text']) {
      const badge = projection.nodes.find((node) => node.id === id);
      const ports = (badge?.data as { ports: { property: string; direction: PortDirection }[] }).ports;
      const value = ports.find((port) => port.property === 'value');
      expect(value?.direction).toBe(OUTPUT);
    }
  });

  it('projects workflow-output edges as port→port connections (never drops them)', () => {
    const projection = graphWorkflowDocumentCanvasModelOf(
      demoDocument(),
      readerOf([codeResolved(), logResolved()])
    );

    expect(projection.edgeIds).toContain('e-final');
    const edge = projection.edges.find((candidate) => candidate.id === 'e-final');
    expect(edge?.source).toBe('ResultLogNode');
    expect(edge?.sourcePort).toBe('logged');
    expect(edge?.target).toBe('output-result');
    expect(edge?.targetPort).toBe('value');
  });

  it('binds every projected edge to real source/target ports', () => {
    const projection = graphWorkflowDocumentCanvasModelOf(
      demoDocument(),
      readerOf([codeResolved(), logResolved()])
    );

    const nodeIds = new Set(projection.nodeIds);
    for (const edge of projection.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
      expect(edge.sourcePort).toBeTruthy();
      expect(edge.targetPort).toBeTruthy();
    }
  });

  it('distributes multiple workflow output badges vertically', () => {
    const document = demoDocument();
    document.outputs = [
      { id: 'first', label: 'first' },
      { id: 'second', label: 'second' },
    ];
    const projection = graphWorkflowDocumentCanvasModelOf(
      document,
      readerOf([codeResolved(), logResolved()])
    );

    const first = projection.nodes.find((node) => node.id === 'output-first');
    const second = projection.nodes.find((node) => node.id === 'output-second');
    expect(first?.position.y).not.toBe(second?.position.y);
    expect((second?.position.y ?? 0) > (first?.position.y ?? 0)).toBe(true);
  });

  it('does not extend the required-input exception to output ports', () => {
    const projection = graphWorkflowDocumentCanvasModelOf(
      demoDocument(),
      readerOf([codeResolved(), logResolved()])
    );

    const code = projection.nodes.find((node) => node.id === 'SplitTextCodeNode');
    const ports = (code?.data as { ports: { property: string; required?: boolean }[] }).ports;
    const result = ports.find((port) => port.property === 'result');
    expect(result?.required).toBe(true);
  });

  it('carries the required flag onto projected input ports (G3-06)', () => {
    const projection = graphWorkflowDocumentCanvasModelOf(
      demoDocument(),
      readerOf([codeResolved(), logResolved()])
    );

    const code = projection.nodes.find((node) => node.id === 'SplitTextCodeNode');
    const ports = (code?.data as { ports: { property: string; required?: boolean }[] }).ports;
    expect(ports.find((port) => port.property === 'code')?.required).toBe(true);
  });

  it('keeps the resolved input port contract intact', () => {
    const resolved = codeResolved();
    expect(portOf(resolved, 'code').required).toBe(true);
    expect(portOf(resolved, 'data').hidden).toBe(true);
  });
});
