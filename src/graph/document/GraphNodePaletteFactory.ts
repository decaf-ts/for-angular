/** @module for-angular/graph/document/GraphNodePaletteFactory
 * @summary Palette manifest → canonical GraphNodeInstance factory (DECAF-50 §4.14).
 * @description Builds the canonical `node.add` command for one editor palette
 * click. The palette carries only manifests — never node constructors — so the
 * factory derives a unique instance id, manifest parameter defaults, a display
 * label and the editor position purely from the manifest and the store
 * document. Command-only policy: the returned command is dispatched by the
 * caller against the SAME store document.
 */
import { ValidationError } from '@decaf-ts/db-decorators';
import type {
  GraphJsonValue,
  GraphNodeInstance,
  GraphNodeManifest,
  GraphParameterDefinition,
  GraphWorkflowDocument,
} from '@decaf-ts/ui-decorators/graph';
import type { GraphDocumentCommand } from './GraphDocumentCommands';
import { graphJsonValueCloneOf } from './GraphDocumentSelectors';

/** Canvas drop position for a palette-created node. */
export interface GraphPalettePosition {
  x: number;
  y: number;
}

/**
 * Stable seed id for an instance derived from a catalog kind (and optional
 * label) so manifest ids stay readable and round-trip safe.
 */
export function graphNodeInstanceSeedId(kind: string, label?: string): string {
  const slug = kind.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const stableInfix = label
    ? label.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 24)
    : '';
  return `${slug}-${stableInfix || Date.now()}`;
}

/** Unique node id inside one document (seed, then `-2`/`-3`… colliding). */
export function graphUniqueNodeIdOf(document: GraphWorkflowDocument, seed: string): string {
  const ids = new Set(document.nodes.map((node) => node.id));
  if (!ids.has(seed)) return seed;
  let counter = 2;
  let candidate = `${seed}-${counter}`;
  while (ids.has(candidate)) {
    counter += 1;
    candidate = `${seed}-${counter}`;
  }
  return candidate;
}

/**
 * Defaults of a manifest's parameters (JSON values only), cloned defensively so
 * palette state never aliases caller-owned manifests.
 */
export function graphNodeParameterDefaultsOf(
  parameters: GraphParameterDefinition[]
): Record<string, GraphJsonValue> {
  const defaults: Record<string, GraphJsonValue> = {};
  for (const parameter of parameters) {
    if (parameter.defaultValue === undefined) continue;
    const value = graphJsonValueCloneOf(parameter.defaultValue);
    if (value !== undefined) defaults[parameter.id] = value;
  }
  return defaults;
}

/**
 * Builds the canonical `node.add` command for a palette manifest click:
 * unique instance id, manifest label, manifest parameter defaults and the
 * editor position.Throws a Decaf ValidationError when the document already
 * carries the seed id (the dispatcher owns the uniqueness contract anyway).
 */
export function graphNodeInstanceFromManifest(
  document: GraphWorkflowDocument,
  manifest: GraphNodeManifest,
  position: GraphPalettePosition,
  label?: string
): GraphDocumentCommand {
  if (!manifest || typeof manifest.kind !== 'string' || !manifest.kind) {
    throw new ValidationError('Graph palette add requires a manifest kind.');
  }
  if (!document || !Array.isArray(document.nodes)) {
    throw new ValidationError('Graph palette add requires a loaded workflow document.');
  }
  if (typeof position !== 'object' || position === null || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new ValidationError('Graph palette add requires a finite numeric position.');
  }
  const resolvedLabel =
    typeof label === 'string' && label
      ? label
      : typeof manifest.display?.name === 'string' && manifest.display.name
        ? manifest.display.name
        : manifest.kind;
  const seedId = graphNodeInstanceSeedId(manifest.kind, manifest.display?.name ?? resolvedLabel);
  const instance: GraphNodeInstance = {
    id: graphUniqueNodeIdOf(document, seedId),
    kind: manifest.kind,
    label: resolvedLabel,
    parameters: graphNodeParameterDefaultsOf(manifest.parameters ?? []),
    ui: { position: { x: position.x, y: position.y } },
  };
  return { type: 'node.add', node: instance };
}
