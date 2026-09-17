/**
 * G4-R1/G4-R2 — default demo workflow contract.
 *
 * R1: the code node ships prefilled with the split code (part of the
 * backend-serialized workflow), so its `code` input is value-provided and its
 * output is the `text` input split into an array of `count`-sized chunks.
 * R2: the foreach keeps a single loop, whose body starts with a Log node
 * (`core.flow.log`) that logs every element of the code node's array.
 *
 * The e2e suites (`tests/playwright/graph/node-split-code.spec.ts`,
 * `node-foreach.spec.ts`) assert the same contract on the running demo.
 */
import type { GraphWorkflowDefinition } from '@decaf-ts/ui-decorators/graph';
import { graphWorkflowDefinitionOf } from '@decaf-ts/ui-decorators/graph';

import { TextPipelineWorkflow } from '../app/pages/graph/workflow-root';
import { buildForeachBodyWorkflow, foreachLoopMetadata } from '../app/pages/graph/loop-body-workflows';

function pipeline(): GraphWorkflowDefinition {
  return graphWorkflowDefinitionOf(TextPipelineWorkflow as never);
}

function codeNodeMetadata(): Record<string, unknown> {
  const node = pipeline().nodes.find((candidate) => candidate.id === 'SplitTextCodeNode');
  if (!node) throw new Error('SplitTextCodeNode missing from the default workflow');
  return node.metadata ?? {};
}

describe('G4-R1 — prefilled split code node', () => {
  it('ships the split code as the code node defaultCode', () => {
    const defaultCode = codeNodeMetadata()['defaultCode'];

    expect(typeof defaultCode).toBe('string');
    expect(String(defaultCode)).toContain('$input.text');
    expect(String(defaultCode)).toContain('$input.count');
    expect(String(defaultCode)).toContain('return chunks');
  });

  it('splits the text input into count-sized chunks when the default code runs', () => {
    const defaultCode = String(codeNodeMetadata()['defaultCode']);
    const run = new Function('$input', defaultCode) as (
      input: Record<string, unknown>
    ) => unknown;

    expect(run({ text: 'a\nb\nc\nd\ne', count: 2 })).toEqual(['a\nb', 'c\nd', 'e']);
    expect(run({ text: 'a\nb\nc', count: 1 })).toEqual(['a', 'b', 'c']);
  });

  it('treats a non-positive count as a single-line chunk size', () => {
    const defaultCode = String(codeNodeMetadata()['defaultCode']);
    const run = new Function('$input', defaultCode) as (
      input: Record<string, unknown>
    ) => unknown;

    expect(run({ text: 'a\nb', count: 0 })).toEqual(['a', 'b']);
  });
});

describe('G4-R2 — foreach single loop with a Log node inside', () => {
  it('keeps exactly one loop on the default workflow', () => {
    const loops = pipeline().nodes.filter((node) => node.kind === 'core.loop.foreach');
    expect(loops).toHaveLength(1);
    expect(loops[0].id).toBe('GraphForeachLoopNode');
  });

  it('starts the foreach loop body with the Log node', () => {
    const body = buildForeachBodyWorkflow();

    expect(body.nodes[0].id).toBe('LoopItemLogNode');
    expect(body.nodes[0].kind).toBe('core.flow.log');
  });

  it('wires the loop item through the Log node into the switch', () => {
    const body = buildForeachBodyWorkflow();
    const relations = body.relations.map((relation) => ({
      source: String(relation.source),
      sourcePort: relation.sourcePort,
      target: String(relation.target),
      targetPort: relation.targetPort,
    }));

    expect(relations).toContainEqual({
      source: 'workflow',
      sourcePort: 'item',
      target: 'LoopItemLogNode',
      targetPort: 'value',
    });
    expect(relations).toContainEqual({
      source: 'LoopItemLogNode',
      sourcePort: 'logged',
      target: 'EvenOddSwitchNode',
      targetPort: 'value',
    });
  });

  it('never nests a second foreach inside the loop body', () => {
    const body = buildForeachBodyWorkflow();

    expect(body.nodes.filter((node) => node.kind === 'core.loop.foreach')).toHaveLength(0);
  });

  it('carries exactly one body workflow on the foreach loop metadata', () => {
    const loop = foreachLoopMetadata()['loop'] as { body: GraphWorkflowDefinition };

    expect(Array.isArray(loop.body)).toBe(false);
    expect(loop.body.nodes[0].id).toBe('LoopItemLogNode');
  });
});
