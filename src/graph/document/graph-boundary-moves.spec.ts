/**
 * G4-R4 — workflow-boundary (results node) drag contract.
 *
 * The results output badge is draggable like any other node (D2/G3-09) and keeps
 * its input connection across the move: the canvas position persists on
 * `document.ui.boundaryPositions` (never on a document node), the
 * `graphDocumentCommandsFromDiagramMutation` translator folds a `nodes-moved`
 * gesture for a boundary id into a `boundary.moves` command, and the projection
 * reads that persisted position back with `draggable: true`. The
 * `tests/playwright/graph/boundary-drag.spec.ts` suite asserts the same on the
 * running demo.
 */
import type {
  GraphNodeInstance,
  GraphNodeManifest,
  GraphResolvedNodeManifest,
  GraphWorkflowDocument,
} from '@decaf-ts/ui-decorators/graph';
import { graphWorkflowDocumentCanvasModelOf } from './GraphDiagramAdapter';
import { applyGraphDocumentCommand } from './GraphDocumentCommands';
import { graphDocumentCommandsFromDiagramMutation } from './GraphDiagramMutationTranslator';
import type { GraphNodeManifestReader } from '../catalog/GraphNodeCatalogReader';

function codeResolved(): GraphResolvedNodeManifest {
  return {
    kind: 'core.flow.code',
    display: { name: 'Code', category: 'Utility', width: 96, height: 96 },
    inputs: [
      { id: 'data', label: 'Data', direction: 'input', required: false },
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
    get: (kind: string) => (byKind.has(kind) ? ({ kind } as GraphNodeManifest) : undefined),
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
    inputs: [{ id: 'count', label: 'count' }],
    outputs: [{ id: 'result', label: 'result' }],
    nodes: [
      { id: 'SplitTextCodeNode', kind: 'core.flow.code', label: 'Split', parameters: {} },
      { id: 'ResultLogNode', kind: 'core.flow.log', label: 'Log Results', parameters: {} },
    ],
    edges: [
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

describe('G4-R4 — boundary moves command, translation and projection', () => {
  describe('applyGraphDocumentCommand — boundary.moves', () => {
    it('persists boundary positions on document.ui.boundaryPositions', () => {
      const next = applyGraphDocumentCommand(demoDocument(), {
        type: 'boundary.moves',
        moves: [{ nodeId: 'output-result', position: { x: 900, y: 300 } }],
      });

      expect(next?.ui?.['boundaryPositions']).toEqual({
        'output-result': { x: 900, y: 300 },
      });
    });

    it('merges a new boundary move with the previously persisted positions', () => {
      const document: GraphWorkflowDocument = {
        ...demoDocument(),
        ui: { boundaryPositions: { 'input-count': { x: 40, y: 480 } } },
      };

      const next = applyGraphDocumentCommand(document, {
        type: 'boundary.moves',
        moves: [{ nodeId: 'output-result', position: { x: 900, y: 300 } }],
      });

      expect(next?.ui?.['boundaryPositions']).toEqual({
        'input-count': { x: 40, y: 480 },
        'output-result': { x: 900, y: 300 },
      });
    });

    it('rejects a boundary move without a finite position', () => {
      expect(() =>
        applyGraphDocumentCommand(demoDocument(), {
          type: 'boundary.moves',
          moves: [{ nodeId: 'output-result', position: { x: Number.NaN, y: 0 } }],
        })
      ).toThrow();
    });
  });

  describe('graphDocumentCommandsFromDiagramMutation — nodes-moved', () => {
    it('folds a moved boundary id into boundary.moves', () => {
      const commands = graphDocumentCommandsFromDiagramMutation(
        demoDocument(),
        {
          type: 'nodes-moved',
          nodes: [{ nodeId: 'output-result', position: { x: 900, y: 300 } }],
        },
        readerOf([codeResolved(), logResolved()])
      );

      expect(commands).toEqual([
        { type: 'boundary.moves', moves: [{ nodeId: 'output-result', position: { x: 900, y: 300 } }] },
      ]);
    });

    it('folds a moved member node into node.moves', () => {
      const commands = graphDocumentCommandsFromDiagramMutation(
        demoDocument(),
        {
          type: 'nodes-moved',
          nodes: [{ nodeId: 'ResultLogNode', position: { x: 500, y: 250 } }],
        },
        readerOf([codeResolved(), logResolved()])
      );

      expect(commands).toEqual([
        { type: 'node.moves', moves: [{ nodeId: 'ResultLogNode', position: { x: 500, y: 250 } }] },
      ]);
    });

    it('emits no command for an unchanged committed boundary position', () => {
      const document: GraphWorkflowDocument = {
        ...demoDocument(),
        ui: { boundaryPositions: { 'output-result': { x: 900, y: 300 } } },
      };

      const commands = graphDocumentCommandsFromDiagramMutation(
        document,
        {
          type: 'nodes-moved',
          nodes: [{ nodeId: 'output-result', position: { x: 900, y: 300 } }],
        },
        readerOf([codeResolved(), logResolved()])
      );

      expect(commands).toEqual([]);
    });
  });

  describe('graphWorkflowDocumentCanvasModelOf — boundary position projection', () => {
    it('projects the persisted boundary position and keeps the badge draggable', () => {
      const document: GraphWorkflowDocument = {
        ...demoDocument(),
        ui: { boundaryPositions: { 'output-result': { x: 900, y: 300 } } },
      };

      const projection = graphWorkflowDocumentCanvasModelOf(
        document,
        readerOf([codeResolved(), logResolved()])
      );

      const badge = projection.nodes.find((node) => node.id === 'output-result');
      expect(badge?.position).toEqual({ x: 900, y: 300 });
      expect((badge as { draggable?: boolean })?.draggable).toBe(true);
    });

    it('falls back to the default boundary position without persisted state', () => {
      const projection = graphWorkflowDocumentCanvasModelOf(
        demoDocument(),
        readerOf([codeResolved(), logResolved()])
      );

      const badge = projection.nodes.find((node) => node.id === 'output-result');
      expect((badge?.position as { x: number }).x).not.toBe(900);
      expect((badge as { draggable?: boolean })?.draggable).toBe(true);
    });

    it('keeps the output badge input edge across the boundary move', () => {
      const document: GraphWorkflowDocument = {
        ...demoDocument(),
        ui: { boundaryPositions: { 'output-result': { x: 900, y: 300 } } },
      };

      const projection = graphWorkflowDocumentCanvasModelOf(
        document,
        readerOf([codeResolved(), logResolved()])
      );

      const edge = projection.edges.find((candidate) => candidate.id === 'e-final');
      expect(edge?.target).toBe('output-result');
      expect(edge?.targetPort).toBe('value');
    });
  });
});
