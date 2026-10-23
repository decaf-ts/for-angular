/** @module for-angular/graph/document/GraphWorkflowLayoutLoader
 * @summary Lazy boundary for the shared graph auto-layout engine (DECAF-50 §4.12).
 * @description The single static reference to `computeGraphWorkflowLayout`. The
 * workflow document store imports this module dynamically so esbuild can split the
 * layout/elk code into a lazy chunk and keep it out of every eager bundle.
 */
export { computeGraphWorkflowLayout } from '@decaf-ts/as-graph/shared';
export type {
  GraphLayoutOptions,
  GraphWorkflowLayoutResult,
} from '@decaf-ts/as-graph/shared';
