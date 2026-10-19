/**
 * @module for-angular/graph/document/GraphDiagramMutationTranslator.spec
 * @summary Arrange/drag-end shared translation unit contract (DECAF-50 §4.12).
 * @description `graphNodeMovesCommandsOf` is the single translation both the
 * drag-end commit path and the `GraphWorkflowDocumentStore.arrange()` auto-layout
 * command use. These tests pin its R4 boundary rule (boundary canvas ids persist
 * on `document.ui.boundaryPositions`, never as `node.moves`), its unchanged-position
 * dropping, and its tolerance of unknown ids.
 */
import type { GraphWorkflowDocument } from '@decaf-ts/as-graph/shared';
import { graphNodeMovesCommandsOf } from './GraphDiagramMutationTranslator';

/** Minimal canonical document with two member nodes, one input and one output port. */
function documentOf(overrides: Partial<GraphWorkflowDocument> = {}): GraphWorkflowDocument {
  return {
    id: 'wf-arrange',
    name: 'Arrange workflow',
    inputs: [{ id: 'count', label: 'count' }],
    outputs: [{ id: 'result', label: 'result' }],
    nodes: [
      {
        id: 'node-1',
        kind: 'core.flow.log',
        label: 'Log',
        parameters: {},
        ui: { position: { x: 0, y: 0 } },
      },
      {
        id: 'node-2',
        kind: 'core.utility.code',
        label: 'Code',
        parameters: {},
        ui: { position: { x: 100, y: 0 } },
      },
    ],
    edges: [],
    ...overrides,
  };
}

describe('graphNodeMovesCommandsOf (DECAF-50 §4.12)', () => {
  it('emits one node.moves command carrying every moved member position', () => {
    const commands = graphNodeMovesCommandsOf(documentOf(), [
      { nodeId: 'node-1', position: { x: 10, y: 20 } },
      { nodeId: 'node-2', position: { x: 300, y: 40 } },
    ]);

    expect(commands).toEqual([
      {
        type: 'node.moves',
        moves: [
          { nodeId: 'node-1', position: { x: 10, y: 20 } },
          { nodeId: 'node-2', position: { x: 300, y: 40 } },
        ],
      },
    ]);
  });

  it('drops member positions that already match the committed document position', () => {
    const commands = graphNodeMovesCommandsOf(documentOf(), [
      { nodeId: 'node-1', position: { x: 0, y: 0 } },
      { nodeId: 'node-2', position: { x: 100, y: 0 } },
    ]);

    expect(commands).toEqual([]);
  });

  it('drops only the unchanged member while committing the moved one', () => {
    const commands = graphNodeMovesCommandsOf(documentOf(), [
      { nodeId: 'node-1', position: { x: 0, y: 0 } },
      { nodeId: 'node-2', position: { x: 500, y: 600 } },
    ]);

    expect(commands).toEqual([
      { type: 'node.moves', moves: [{ nodeId: 'node-2', position: { x: 500, y: 600 } }] },
    ]);
  });

  it('emits boundary.moves for a boundary id and never node.moves (R4)', () => {
    const commands = graphNodeMovesCommandsOf(documentOf(), [
      { nodeId: 'output-result', position: { x: 900, y: 300 } },
    ]);

    expect(commands).toEqual([
      {
        type: 'boundary.moves',
        moves: [{ nodeId: 'output-result', position: { x: 900, y: 300 } }],
      },
    ]);
    expect(commands.some((command) => command.type === 'node.moves')).toBe(false);
  });

  it('treats a legacy boundary badge carried in document.nodes as a boundary, not a member', () => {
    const document = documentOf({
      nodes: [
        {
          id: 'output-result',
          kind: 'output-result',
          label: 'result',
          parameters: { role: 'output' },
        },
        {
          id: 'node-1',
          kind: 'core.flow.log',
          label: 'Log',
          parameters: {},
          ui: { position: { x: 0, y: 0 } },
        },
      ],
    });

    const commands = graphNodeMovesCommandsOf(document, [
      { nodeId: 'output-result', position: { x: 900, y: 300 } },
    ]);

    expect(commands).toEqual([
      {
        type: 'boundary.moves',
        moves: [{ nodeId: 'output-result', position: { x: 900, y: 300 } }],
      },
    ]);
    expect(commands.some((command) => command.type === 'node.moves')).toBe(false);
  });

  it('drops a boundary move that already matches document.ui.boundaryPositions', () => {
    const document = documentOf({
      ui: { boundaryPositions: { 'output-result': { x: 900, y: 300 } } },
    });

    const commands = graphNodeMovesCommandsOf(document, [
      { nodeId: 'output-result', position: { x: 900, y: 300 } },
    ]);

    expect(commands).toEqual([]);
  });

  it('ignores node ids that are neither member nodes nor declared boundaries', () => {
    const commands = graphNodeMovesCommandsOf(documentOf(), [
      { nodeId: 'missing-node', position: { x: 42, y: 42 } },
      { nodeId: 'input-undeclared', position: { x: 7, y: 7 } },
    ]);

    expect(commands).toEqual([]);
  });

  it('keeps member and boundary moves in separate commands', () => {
    const commands = graphNodeMovesCommandsOf(documentOf(), [
      { nodeId: 'node-1', position: { x: 10, y: 20 } },
      { nodeId: 'output-result', position: { x: 900, y: 300 } },
    ]);

    expect(commands).toEqual([
      { type: 'node.moves', moves: [{ nodeId: 'node-1', position: { x: 10, y: 20 } }] },
      {
        type: 'boundary.moves',
        moves: [{ nodeId: 'output-result', position: { x: 900, y: 300 } }],
      },
    ]);
  });

  it('returns an empty list for empty input', () => {
    expect(graphNodeMovesCommandsOf(documentOf(), [])).toEqual([]);
  });
});
