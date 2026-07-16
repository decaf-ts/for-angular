import { Model, model, required } from '@decaf-ts/decorator-validation';
import { uielement } from '@decaf-ts/ui-decorators';
import { graph, input, node, output } from '@decaf-ts/ui-decorators/graph';
import { CodeInputSchema, LogFlowNode } from '@decaf-ts/integrations/graph/shared';

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

/**
 * Switch node — routes the split-text array based on line count.
 * Case "Short" (< 3 lines), Case "Long" (>= 5 lines), Default (everything
 * else). Each output port goes to a dedicated Log node so the branching is
 * visible on the canvas (DECAF-34 §6.2).
 */
@node('line-length-switch', {
  kind: 'core.flow.switch',
  category: 'Flow Control',
  color: '#f97316',
  icon: 'ti-arrows-shuffle',
  width: 120,
  height: 140,
  labels: ['flow', 'switch', 'line-length'],
  metadata: {
    title: 'Line length switch',
    description: 'Routes the split text based on the number of lines: short (< 3), long (>= 5), or default.',
    switch: {
      cases: [
        {
          id: 'short',
          label: 'Short',
          outputPort: 'short',
          condition: { op: 'lt', left: { path: 'length' }, right: { const: 3 } },
        },
        {
          id: 'long',
          label: 'Long',
          outputPort: 'long',
          condition: { op: 'gte', left: { path: 'length' }, right: { const: 5 } },
        },
      ],
      defaultPort: 'default',
      hasDefault: true,
    },
  },
})
@model()
export class LineLengthSwitchNode extends Model {
  @required()
  @uielement('textarea', { label: 'Input value', placeholder: 'Value to switch on' })
  @input({ handle: 'value' })
  value!: unknown;

  @required()
  @uielement('input', { label: 'Short', placeholder: 'Output for short arrays' })
  @output({ handle: 'short' })
  short!: unknown;

  @required()
  @uielement('input', { label: 'Long', placeholder: 'Output for long arrays' })
  @output({ handle: 'long' })
  long!: unknown;

  @required()
  @uielement('input', { label: 'Default', placeholder: 'Default output' })
  @output({ handle: 'default' })
  default!: unknown;
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
      id: LineLengthSwitchNode.name,
      kind: 'core.flow.switch',
      label: 'Switch',
      node: LineLengthSwitchNode,
    },
    {
      id: 'ShortLogNode',
      kind: 'core.flow.log',
      label: 'Log Short',
      node: LogFlowNode,
    },
    {
      id: 'LongLogNode',
      kind: 'core.flow.log',
      label: 'Log Long',
      node: LogFlowNode,
    },
    {
      id: 'DefaultLogNode',
      kind: 'core.flow.log',
      label: 'Log Default',
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
      target: LineLengthSwitchNode.name,
      targetPort: 'value',
      label: 'lines',
    },
    {
      source: LineLengthSwitchNode.name,
      sourcePort: 'short',
      target: 'ShortLogNode',
      targetPort: 'value',
      label: 'short',
    },
    {
      source: LineLengthSwitchNode.name,
      sourcePort: 'long',
      target: 'LongLogNode',
      targetPort: 'value',
      label: 'long',
    },
    {
      source: LineLengthSwitchNode.name,
      sourcePort: 'default',
      target: 'DefaultLogNode',
      targetPort: 'value',
      label: 'default',
    },
    {
      source: 'ShortLogNode',
      sourcePort: 'logged',
      target: 'workflow',
      targetPort: 'result',
      label: 'short-result',
    },
    {
      source: 'LongLogNode',
      sourcePort: 'logged',
      target: 'workflow',
      targetPort: 'result',
      label: 'long-result',
    },
    {
      source: 'DefaultLogNode',
      sourcePort: 'logged',
      target: 'workflow',
      targetPort: 'result',
      label: 'default-result',
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
