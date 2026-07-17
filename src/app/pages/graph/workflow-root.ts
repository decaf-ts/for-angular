import { Model, model, required } from '@decaf-ts/decorator-validation';
import { uielement } from '@decaf-ts/ui-decorators';
import { graph, input, node, output } from '@decaf-ts/ui-decorators/graph';
import { CodeInputSchema, LogFlowNode } from '@decaf-ts/integrations/graph/shared';
import { GraphForeachLoopNode } from './example-nodes';

/**
 * Code node that splits the input text by newlines into an array.
 * The `data` input port (hidden, from `CodeInputSchema`) receives the
 * `text` workflow input via a badge connection. The default code is
 * stored in `metadata.defaultCode` and used as a fallback when the `code`
 * input port is not wired.
 */
@node('split-text-code', {
  kind: 'core.flow.code',
  category: 'Utility',
  color: '#7c3aed',
  icon: 'ti-code',
  width: 96,
  height: 96,
  labels: ['flow', 'code', 'split'],
  metadata: {
    title: 'Split text',
    description: 'Splits the input text by newlines into an array.',
    timeoutMs: 1000,
    defaultCode: 'return $input.text.split("\\n");',
  },
})
@model()
export class SplitTextCodeNode extends Model {
  @required()
  @input({ handle: 'input' })
  input!: CodeInputSchema;

  @required()
  @output({ handle: 'result', connectionRules: { allowMultiple: true } })
  result!: unknown;
}

@graph('graph-workflow-root', {
  kind: 'workflow',
  category: 'Workflow',
  color: '#f59e0b',
  icon: 'ti-sitemap',
  labels: ['workflow', 'root'],
  metadata: {
    title: 'Text pipeline',
    description:
      'Splits text into lines, iterates with Foreach, routes even/odd items through Switch to Code (log) or Log (discard).',
  },
  nodes: [
    {
      id: SplitTextCodeNode.name,
      kind: 'core.flow.code',
      label: 'Split',
      node: SplitTextCodeNode,
    },
    {
      id: GraphForeachLoopNode.name,
      kind: 'core.loop.foreach',
      label: 'Foreach',
      node: GraphForeachLoopNode,
    },
    {
      id: 'ResultLogNode',
      kind: 'core.flow.log',
      label: 'Log Results',
      node: LogFlowNode,
    },
  ],
  relations: [
    {
      source: 'workflow',
      sourcePort: 'count',
      target: SplitTextCodeNode.name,
      targetPort: 'data',
      label: 'count',
    },
    {
      source: 'workflow',
      sourcePort: 'text',
      target: SplitTextCodeNode.name,
      targetPort: 'data',
      label: 'text',
    },
    {
      source: SplitTextCodeNode.name,
      sourcePort: 'result',
      target: GraphForeachLoopNode.name,
      targetPort: 'items',
      label: 'lines',
    },
    {
      source: GraphForeachLoopNode.name,
      sourcePort: 'completed',
      target: 'ResultLogNode',
      targetPort: 'value',
      label: 'results',
    },
    {
      source: 'ResultLogNode',
      sourcePort: 'logged',
      target: 'workflow',
      targetPort: 'result',
      label: 'final-result',
    },
  ],
})
@model()
export class TextPipelineWorkflow extends Model {
  @required()
  @uielement('input', {
    label: 'Count',
    placeholder: 'Number of items to process',
    value: 1,
  })
  @input({
    handle: 'count',
    connectionRules: {
      allowMultiple: true,
    },
  })
  count!: number;

  @required()
  @uielement('textarea', {
    label: 'Text',
    placeholder: 'Text to split by newlines',
    value: 'Hello\nWorld\nFoo\nBar\nBaz',
  })
  @input({
    handle: 'text',
    connectionRules: {
      allowMultiple: true,
    },
  })
  text!: string;

  @required()
  @uielement('input', {
    label: 'Results',
    placeholder: 'Processed results',
  })
  @output({
    handle: 'result',
    connectionRules: {
      allowMultiple: true,
    },
  })
  result!: unknown[];
}
