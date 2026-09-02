import { EventEmitter } from '@angular/core';
import type {
  GraphCredentialReference,
  GraphJsonValue,
  GraphNodeInstance,
  GraphNodeManifest,
  GraphParameterDefinition,
} from '@decaf-ts/ui-decorators/graph';

/** A parameter value: any JSON value, or `undefined` while unset. */
export type GraphJsonValueOrUndefined = GraphJsonValue | undefined;

/** A validation issue for one parameter value, from manifest validation rules or intrinsic type checks. */
export interface GraphParameterValueIssue {
  parameterId: string;
  message: string;
  path?: string;
  level: 'error' | 'warning';
}

/** Context handed to parameter renderers: the node, its manifest, current values, and option-loading callbacks. */
export interface GraphParameterFormContext {
  node: GraphNodeInstance;
  manifest: GraphNodeManifest;
  values: Record<string, GraphJsonValueOrUndefined>;
  credentialOptions?: GraphCredentialReference[];
  loadOptions?: (
    parameter: GraphParameterDefinition,
    request: Record<string, GraphJsonValue>
  ) => Promise<GraphJsonValue>;
}

/**
 * Inputs every schema-driven parameter renderer component implements: the
 * parameter definition, its current value, disabled state, form context,
 * and the `valueChange`/`errorChange` emitters the form builder listens to.
 */
export interface GraphParameterRendererContract {
  parameter: GraphParameterDefinition;
  value: GraphJsonValueOrUndefined;
  disabled?: boolean;
  context?: GraphParameterFormContext;
  valueChange: EventEmitter<GraphJsonValueOrUndefined>;
  errorChange: EventEmitter<GraphParameterValueIssue[]>;
}
