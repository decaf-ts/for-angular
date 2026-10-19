/**
 * @module graph/components/feature-host/graph-feature-components
 * @description Optional feature-component injection tokens for the diagrams
 * entry point.
 *
 * The graph editor renders a code editor and a model-builder widget for
 * specialised ports. Those widgets belong to the `/code-editor` and
 * `/model-builder` secondary entry points, so the `/diagrams` entry point must
 * not import them statically. Host applications that import both entry points
 * register the concrete component classes through these tokens; without a
 * registration the graph shows a dependency-free text fallback.
 */
import { InjectionToken, Type } from '@angular/core';

/** Concrete component class supplied by a host for code-editor ports. */
export type GraphCodeEditorComponentType = Type<unknown>;

/** Concrete component class supplied by a host for model-builder ports. */
export type GraphModelBuilderComponentType = Type<unknown>;

/** Optional `/code-editor` component registration (unset by default). */
export const GRAPH_CODE_EDITOR_COMPONENT = new InjectionToken<GraphCodeEditorComponentType | null>(
  'GRAPH_CODE_EDITOR_COMPONENT',
  { factory: () => null }
);

/** Optional `/model-builder` component registration (unset by default). */
export const GRAPH_MODEL_BUILDER_COMPONENT =
  new InjectionToken<GraphModelBuilderComponentType | null>('GRAPH_MODEL_BUILDER_COMPONENT', {
    factory: () => null,
  });
