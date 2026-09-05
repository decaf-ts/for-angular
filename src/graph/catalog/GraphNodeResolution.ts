/** @module for-angular/graph/catalog/GraphNodeResolution
 * @summary Frontend-safe node manifest resolution with dynamic-port rules (DECAF-50 §4.12).
 * @description Mirrors the engine's `GraphNodeManifestResolver` semantics — `repeatFromParameter`
 * reads the node-instance parameter identified by the rule, expands `${id}`/`${index}`/`${label}`
 * port id templates, and claims non-colliding dynamic ports. Implemented frontend-safe because
 * the for-angular wall forbids importing the backend engine; `GraphNodeCatalogApi` swaps to the
 * HTTP `/node-types/{kind}/resolve` endpoint once the NestJS catalogue ships.
 */
import type {
  GraphDynamicPortRule,
  GraphJsonPrimitive,
  GraphJsonValue,
  GraphNodeManifest,
  GraphPortManifest,
} from '@decaf-ts/ui-decorators/graph';
import { isGraphPortManifest } from '@decaf-ts/ui-decorators/graph';
import type { GraphResolvedNodeManifest } from '@decaf-ts/ui-decorators/graph';

/** Manifest slice consumed by dynamic-port expansion: the rule list plus static ports per direction. */
export type GraphNodeManifestWithDynamicPorts = Pick<
  GraphNodeManifest,
  'dynamicPorts' | 'inputs' | 'outputs' | 'connections'
>;

/** Result of expanding a manifest's dynamic-port rules: concrete input/output/connection ports. */
export interface GraphDynamicPortResolution {
  inputs: GraphPortManifest[];
  outputs: GraphPortManifest[];
  connections: GraphPortManifest[];
}

function readItemPath(item: unknown, path: string): unknown {
  if (!path) return undefined;
  let current: unknown = item;
  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function expandPortIdTemplate(
  template: string,
  values: { id: string; index: number; label: string }
): string {
  return template
    .replace(/\$\{id\}/g, values.id)
    .replace(/\$\{index\}/g, String(values.index))
    .replace(/\$\{label\}/g, values.label);
}

function isGraphJsonPrimitive(value: unknown): value is GraphJsonPrimitive {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function dynamicPortIdFor(
  rule: Extract<GraphDynamicPortRule, { type: 'repeatFromParameter' }>,
  item: unknown,
  index: number
): { id: string; label: string | undefined } {
  const rawId = readItemPath(item, rule.itemIdPath);
  const rawLabel = rule.itemLabelPath ? readItemPath(item, rule.itemLabelPath) : undefined;
  const id =
    (typeof rawId === 'string' && rawId) ||
    (typeof rawId === 'number' && Number.isFinite(rawId) && String(rawId)) ||
    String(index);
  const label = typeof rawLabel === 'string' ? rawLabel : undefined;
  return { id, label };
}

function dynamicPortTargets(
  resolution: GraphDynamicPortResolution,
  direction: 'input' | 'output' | 'connection'
): GraphPortManifest[] {
  switch (direction) {
    case 'input':
      return resolution.inputs;
    case 'output':
      return resolution.outputs;
    default:
      return resolution.connections;
  }
}

function cloneGraphPort(port: unknown): GraphPortManifest {
  return JSON.parse(JSON.stringify(port)) as GraphPortManifest;
}

/**
 * Frontend mirror of the backend's dynamic-port expansion (DECAF-50 §4.11):
 * expands a manifest's `dynamicPorts` rules against parameter values so the
 * editor can render the same effective ports the validator resolves
 * server-side. Static port ids are never duplicated.
 */
export function resolveGraphDynamicPorts(
  manifest: GraphNodeManifestWithDynamicPorts,
  parameters: Record<string, GraphJsonValue>
): GraphDynamicPortResolution {
  const resolution: GraphDynamicPortResolution = { inputs: [], outputs: [], connections: [] };
  const seen = {
    input: new Set<string>((manifest.inputs ?? []).map((port) => port.id)),
    output: new Set<string>((manifest.outputs ?? []).map((port) => port.id)),
    connection: new Set<string>((manifest.connections ?? []).map((port) => port.id)),
  };
  const claim = (direction: 'input' | 'output' | 'connection', portId: string): boolean => {
    const taken = seen[direction];
    if (taken.has(portId)) return false;
    taken.add(portId);
    return true;
  };

  for (const rule of manifest.dynamicPorts ?? []) {
    if (rule.type === 'repeatFromParameter') {
      const value = parameters[rule.parameter];
      if (!Array.isArray(value)) continue;
      const targets = dynamicPortTargets(resolution, rule.direction);
      value.forEach((item, index) => {
        const { id, label } = dynamicPortIdFor(rule, item, index);
        const portId = expandPortIdTemplate(rule.portIdTemplate, {
          id,
          index,
          label: label ?? id,
        });
        if (!claim(rule.direction, portId)) return;
        const base = rule.defaultPort
          ? cloneGraphPort(rule.defaultPort)
          : ({ id: portId, label: label ?? portId, direction: rule.direction } as GraphPortManifest);
        const port = cloneGraphPort(base);
        port.id = portId;
        port.direction = rule.direction;
        if (label) port.label = label;
        targets.push(port);
      });
      continue;
    }
    if (rule.type !== 'togglePort') continue;
    const value = parameters[rule.parameter];
    if (value !== rule.equals) continue;
    const port = cloneGraphPort(rule.port);
    if (!claim(port.direction, port.id)) continue;
    dynamicPortTargets(resolution, port.direction).push(port);
  }
  return resolution;
}

/**
 * Resolves a manifest without engine imports. `extras` (node-instance
 * metadata/parameters) feed dynamic-port rules, exactly like the backend
 * resolver's `parameters` input.
 */
export function resolveGraphNodeManifest(
  manifest: GraphNodeManifest,
  parameters: Record<string, GraphJsonValue>,
  extras?: Record<string, GraphJsonValue>
): GraphResolvedNodeManifest {
  const dynamic = resolveGraphDynamicPorts(manifest, {
    ...cloneRecordOf(extras),
    ...cloneRecordOf(parameters),
  } as never as Record<string, GraphJsonValue>);
  const resolved: GraphResolvedNodeManifest = {
    kind: manifest.kind,
    display: manifest.display,
    inputs: [...manifest.inputs, ...dynamic.inputs],
    outputs: [...manifest.outputs, ...dynamic.outputs],
    parameters: manifest.parameters,
  };
  const connections = [...(manifest.connections ?? []), ...dynamic.connections];
  if (connections.length) resolved.connections = connections;
  if (manifest.dynamicPorts?.length) resolved.dynamicPorts = manifest.dynamicPorts;
  if (manifest.credentials?.length) resolved.credentials = manifest.credentials;
  if (manifest.capabilities?.length) resolved.capabilities = manifest.capabilities;
  if (manifest.policies) resolved.policies = manifest.policies;
  if (manifest.metadata) resolved.metadata = manifest.metadata;
  return resolved;
}

function cloneRecordOf(value: Record<string, unknown> | undefined): Record<string, unknown> {
  return value ? JSON.parse(JSON.stringify(value)) as Record<string, unknown> : {};
}

export { isGraphPortManifest };
