/**
 * @module for-angular/graph/document/GraphNodeValueHydration
 * @summary Seeds compiled/authored workflow node instances with the property
 * values the canonical document must carry (DECAF-50 §4.26 R2-1, §4.4.5).
 * @description The decorated-workflow authoring compiler is catalogue-free: it
 * folds each node's `default<PortId>` metadata and the legacy `metadata.loop`
 * configuration into `parameters`, but it never sees the backend manifest
 * parameter `defaultValue`s. Once the catalogue manifests are available this
 * hydration pass closes that gap, exactly matching the palette path
 * (`GraphNodePaletteFactory`): every missing manifest parameter default is
 * seeded into the instance `parameters`, every directly-provided input
 * (`default<PortId>` metadata) is seeded into `parameters` (§4.4.5 rule 6), and
 * every edge-bound data input is recorded on the instance `inputBindings` as
 * `{ mode: "edge" }` (§4.4.5 rules 1 and 7). Existing values and bindings
 * always win, so the pass is idempotent; node instances are cloned, never
 * mutated in place.
 */
import type {
  GraphInputBinding,
  GraphJsonValue,
  GraphNodeInstance,
  GraphNodeManifest,
  GraphWorkflowDocument,
} from '@decaf-ts/ui-decorators/graph';
import { graphWorkflowNodeCloneOf } from './GraphDocumentSelectors';

/** Clones a JSON value defensively, returning `undefined` for absent values. */
function cloneGraphJsonValue(value: GraphJsonValue | undefined): GraphJsonValue | undefined {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value)) as GraphJsonValue;
  } catch {
    return undefined;
  }
}

/** A directly-provided value is anything but `undefined`, `null` or a blank string. */
function isGraphProvidedValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  return typeof value !== 'string' || value.trim().length > 0;
}

/** Reads the `default<PortId>` metadata fallback of one input port. */
function metadataDefaultPortValueOf(
  node: GraphNodeInstance,
  portId: string
): GraphJsonValue | undefined {
  const metadata = (node.metadata ?? {}) as Record<string, unknown>;
  const key = `default${portId.charAt(0).toUpperCase()}${portId.slice(1)}`;
  const value = metadata[key];
  return isGraphProvidedValue(value) ? cloneGraphJsonValue(value as GraphJsonValue) : undefined;
}

/**
 * Reads the `core.flow.switch` instance `metadata.switch` block into the
 * non-port operation/configuration fields the canonical document must carry
 * (§4.4.5 rule 6): `cases` (the switch's declared parameter, which its
 * dynamic output ports derive from) and `hasDefault` (the toggle that owns the
 * static `default` output port). The editor authors the block on the instance,
 * so it is the instance value that wins over the generic manifest defaults.
 */
function metadataSwitchParametersOf(
  node: GraphNodeInstance
): Record<string, GraphJsonValue> {
  const metadata = (node.metadata ?? {}) as Record<string, unknown>;
  const block = metadata['switch'];
  if (!block || typeof block !== 'object' || Array.isArray(block)) return {};
  const record = block as Record<string, unknown>;
  const parameters: Record<string, GraphJsonValue> = {};
  const cases = record['cases'];
  if (Array.isArray(cases) && cases.length) {
    parameters['cases'] = cloneGraphJsonValue(cases as GraphJsonValue) as GraphJsonValue;
  }
  if (typeof record['hasDefault'] === 'boolean') {
    parameters['hasDefault'] = record['hasDefault'];
  }
  return parameters;
}

/** Whether the manifest declares a parameter with the given id. */
function manifestDeclaresParameter(
  manifest: GraphNodeManifest | undefined,
  parameterId: string
): boolean {
  return (manifest?.parameters ?? []).some((parameter) => parameter.id === parameterId);
}

/** Incoming data-edge target ports keyed by node id. */
function incomingDataPortsOf(document: GraphWorkflowDocument): Map<string, Set<string>> {
  const incoming = new Map<string, Set<string>>();
  for (const edge of document.edges ?? []) {
    if (edge.type !== 'data') continue;
    const target = edge.target;
    if (!target || target.scope !== 'node') continue;
    const ports = incoming.get(target.nodeId) ?? new Set<string>();
    ports.add(target.port);
    incoming.set(target.nodeId, ports);
  }
  return incoming;
}

/**
 * Seeds one node instance's property values/bindings from its manifest: missing
 * manifest parameter defaults and `default<PortId>` metadata fallbacks go into
 * `parameters`, and edge-bound data inputs are recorded on `inputBindings`.
 * Existing values and bindings are preserved (idempotent).
 */
export function hydrateGraphNodeInstanceValues(
  node: GraphNodeInstance,
  manifest: GraphNodeManifest | undefined,
  incomingDataPorts: ReadonlySet<string> = new Set()
): GraphNodeInstance {
  const hydrated = graphWorkflowNodeCloneOf(node);
  const parameters = { ...(hydrated.parameters ?? {}) };
  for (const parameter of manifest?.parameters ?? []) {
    if (parameters[parameter.id] !== undefined) continue;
    const value = cloneGraphJsonValue(parameter.defaultValue);
    if (value !== undefined) parameters[parameter.id] = value;
  }
  for (const port of manifest?.inputs ?? []) {
    if (parameters[port.id] !== undefined) continue;
    const value = metadataDefaultPortValueOf(hydrated, port.id);
    if (value !== undefined) parameters[port.id] = value;
  }
  for (const [key, value] of Object.entries(metadataSwitchParametersOf(hydrated))) {
    if (!manifestDeclaresParameter(manifest, key)) continue;
    parameters[key] = value;
  }
  hydrated.parameters = parameters;
  const inputBindings: Record<string, GraphInputBinding> = {
    ...(hydrated.inputBindings ?? {}),
  };
  for (const portId of incomingDataPorts) {
    if (inputBindings[portId] !== undefined) continue;
    inputBindings[portId] = { mode: 'edge' };
  }
  if (Object.keys(inputBindings).length) hydrated.inputBindings = inputBindings;
  return hydrated;
}

/**
 * Hydrates every node instance of a canonical workflow document with the
 * property values/bindings its catalogue manifests declare (§4.26 R2-1). Nodes
 * whose kind has no manifest are returned untouched. Nested loop bodies are
 * canonical documents too (§4.4.8), so they are hydrated recursively with the
 * same manifest catalogue.
 */
export function hydrateGraphWorkflowDocumentValues(
  document: GraphWorkflowDocument,
  manifests: readonly GraphNodeManifest[]
): GraphWorkflowDocument {
  if (!document || !Array.isArray(document.nodes) || !manifests.length) return document;
  const manifestByKind = new Map(manifests.map((manifest) => [manifest.kind, manifest]));
  const incomingByNode = incomingDataPortsOf(document);
  return {
    ...document,
    nodes: document.nodes.map((node) => {
      const hydrated = hydrateGraphNodeInstanceValues(
        node,
        manifestByKind.get(node.kind),
        incomingByNode.get(node.id) ?? new Set<string>()
      );
      const body = hydrated.loop?.body;
      if (!body || !Array.isArray(body.nodes) || !body.nodes.length) return hydrated;
      return {
        ...hydrated,
        loop: {
          ...hydrated.loop,
          body: hydrateGraphWorkflowDocumentValues(body, manifests),
        },
      };
    }),
  };
}
