import { Model, model, required } from '@decaf-ts/decorator-validation';
import { uielement } from '@decaf-ts/ui-decorators';
import {
  CodeFlowNode,
  LogFlowNode,
  GraphForeachLoopNode,
  graph,
  input,
  output,
} from '@decaf-ts/ui-decorators/graph';
import { foreachLoopMetadata } from './loop-body-workflows';

/**
 * Split Code node — composes the shared system kind `core.flow.code`
 * (`CodeFlowNode`): splits the input text by newlines into an array.
 * The `data` input port receives the `text`/`count` workflow inputs via
 * badge connections. The default code (`metadata.defaultCode`) is used as a
 * fallback when the `code` input port is not wired.
 */
const splitCodeNodeMetadata: Record<string, unknown> = {
  title: 'Split text',
  description: 'Splits the input text by newlines into an array.',
  timeoutMs: 1000,
  defaultCode: 'return $input.text.split("\\n");',
};

/**
 * The demo workflow root (DECAF-50 canonical frontend): composed exclusively
 * from system node kinds instantiated per-workflow — the shared `core.flow.code`
 * node (Split), the shared `core.loop.foreach` node (Foreach, with the demo's
 * loop-body patch) and the shared `core.flow.log` node (Log Results).
 */
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
      id: 'SplitTextCodeNode',
      kind: 'core.flow.code',
      label: 'Split',
      node: CodeFlowNode,
      metadata: splitCodeNodeMetadata,
    },
    {
      id: 'GraphForeachLoopNode',
      kind: 'core.loop.foreach',
      label: 'Foreach',
      node: GraphForeachLoopNode,
      metadata: foreachLoopMetadata(),
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
      target: 'SplitTextCodeNode',
      targetPort: 'data',
      label: 'count',
    },
    {
      source: 'workflow',
      sourcePort: 'text',
      target: 'SplitTextCodeNode',
      targetPort: 'data',
      label: 'text',
    },
    {
      source: 'SplitTextCodeNode',
      sourcePort: 'result',
      target: 'GraphForeachLoopNode',
      targetPort: 'items',
      label: 'lines',
    },
    {
      source: 'GraphForeachLoopNode',
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
