/** @module for-angular/graph/catalog/GraphNodeManifestFixtures
 * @summary Node manifest fixtures for the canonical Angular catalogue (DECAF-50 §4.12).
 * @description The Angular demo compiles its catalogue from frontend-safe manifests
 * built with the ui-decorators `graphNodeManifest` compiler from the decorated
 * `@node` classes the demo already imports. The demo's own decorated kinds keep
 * their locally compiled shapes AND display (the backend publishes its own
 * built-ins for the same kinds, whose port/parameter shapes may differ), while
 * the shared registry constructors (triggers, flow control, agents) overlay the
 * backend-published `display` so the palette presents the platform's human node
 * titles instead of the shared class names. The `core.flow.switch` fixture adds
 * the canonical dynamic `cases` port contract via a `repeatFromParameter` rule.
 * No node constructor ever reaches the catalogue map; all payloads are the
 * published `GraphNodeManifest` JSON shape.
 */
import { Injectable } from '@angular/core';
import { InternalError, NotFoundError } from '@decaf-ts/db-decorators';
import { graphNodeManifest } from '@decaf-ts/ui-decorators/graph';
import type { GraphJsonValue, GraphNodeInstance, GraphNodeManifest, GraphPortManifest } from '@decaf-ts/ui-decorators/graph';
import type { GraphResolvedNodeManifest } from '@decaf-ts/integrations/graph/shared';
import {
  GRAPH_AGENT_NODES,
  GRAPH_BUILT_IN_NODE_MANIFESTS_BY_KIND,
  GRAPH_FLOW_CONTROL_NODES,
  GRAPH_TRIGGER_NODES,
} from '@decaf-ts/integrations/graph/shared';
import { GRAPH_DEMO_NODES } from '../../app/pages/graph/example-nodes';
import { resolveGraphNodeManifest } from './GraphNodeResolution';
import type { GraphNodeCatalogSource } from './GraphNodeCatalogStore';

/**
 * Constructors the frontend fixtures are compiled from. Graph node classes
 * extend `Model` with a protected constructor, so the fixture only exposes the
 * concrete constructor symbols it imports — never a general `new` contract.
 */
export const GRAPH_NODE_MANIFEST_FIXTURE_CONSTRUCTORS = [
  ...GRAPH_DEMO_NODES,
  ...GRAPH_TRIGGER_NODES,
  ...GRAPH_FLOW_CONTROL_NODES,
  ...GRAPH_AGENT_NODES,
] as const;

/**
 * The shared registry constructors whose fixture manifests mirror the backend's
 * own `@node` classes: their published `display` overlays the locally compiled
 * one so palette titles stay human ('Utility Log', 'Switch', …) and match the
 * backend catalogue exactly for every kind the backend also publishes.
 */
const GRAPH_SHARED_NODE_CONSTRUCTORS = new Set<unknown>([
  ...GRAPH_TRIGGER_NODES,
  ...GRAPH_FLOW_CONTROL_NODES,
  ...GRAPH_AGENT_NODES,
]);

/** The fixture-manifest constructor union: shared `@node` classes plus demo-only kinds whose manifests are compiled locally. */
export type GraphNodeFixtureConstructor =
  (typeof GRAPH_NODE_MANIFEST_FIXTURE_CONSTRUCTORS)[number];

/** Canonical switch `cases` dynamic-output-port contract (demo-authoritative overlay on the shared class). */
const GRAPH_SWITCH_DYNAMIC_PORTS = [
  {
    type: 'repeatFromParameter',
    parameter: 'cases',
    itemIdPath: 'outputPort',
    itemLabelPath: 'label',
    direction: 'output',
    portIdTemplate: '${id}',
  },
] as const;

/**
 * Utility Log non-port parameter (the shared class's `@uielement`-marked `level`
 * field): `graphNodeManifest` compiles ports into the parameter surface only, so
 * the published non-port parameters' shape is carried by the fixtures. Shape
 * derives from the shared {@link UtilityLogNode} class ("Logs the input value …
 * at a configurable level").
 */
const GRAPH_UTILITY_LOG_PARAMETERS = [
  {
    type: 'string',
    id: 'level',
    label: 'Log level',
    defaultValue: 'info',
  },
] as const;

/** Canonical `core.flow.switch` cases collection parameter (demo-authoritative shape facts: static `default` port + `cases` collection + `repeatFromParameter` rule). */
const GRAPH_SWITCH_CASES_PARAMETER = {
  id: 'cases',
  label: 'Switch cases',
  type: 'collection',
  itemIdPath: 'outputPort',
  itemLabelPath: 'label',
  itemParameters: [
    { id: 'outputPort', label: 'Output port', type: 'string', required: true },
    { id: 'label', label: 'Case label', type: 'string', required: true },
    { id: 'mode', label: 'Mode', type: 'string', defaultValue: 'graphical' },
    { id: 'value', label: 'Value', type: 'string' },
    { id: 'code', label: 'Code', type: 'code' },
    { id: 'left', label: 'Left', type: 'string' },
    { id: 'operator', label: 'Operator', type: 'string' },
    { id: 'right', label: 'Right', type: 'string' },
  ] as const,
  metadata: { decafGraph: 'switch-cases' },
} as never;

function compileManifest(ctor: GraphNodeFixtureConstructor): GraphNodeManifest {
  const manifest = graphNodeManifest(ctor as never);
  // Shared registry constructors carry the backend-published display (human
  // titles/categories/colors/icons); the demo's own decorated kinds keep their
  // locally compiled display so the palette presents the demo's node shapes.
  const sharedDisplay =
    GRAPH_SHARED_NODE_CONSTRUCTORS.has(ctor)
      ? GRAPH_BUILT_IN_NODE_MANIFESTS_BY_KIND[manifest.kind ?? '']?.display
      : undefined;
  const withDisplay: GraphNodeManifest = sharedDisplay
    ? { ...manifest, display: sharedDisplay }
    : manifest;
  if (isGraphSwitchKind(withDisplay.kind)) {
    const outputs: GraphPortManifest[] = withDisplay.outputs;
    const defaultPortIndex = outputs.findIndex((port) => port.id === 'default');
    const defaultPort = defaultPortIndex >= 0 ? outputs[defaultPortIndex] : undefined;
    const casePorts = outputs.filter((port) => port.id !== 'default');
    const patched: GraphNodeManifest = {
      ...withDisplay,
      outputs: defaultPort ? [...casePorts, defaultPort] : outputs,
      parameters: [...withDisplay.parameters, GRAPH_SWITCH_CASES_PARAMETER],
      dynamicPorts: [...(withDisplay.dynamicPorts ?? []), ...GRAPH_SWITCH_DYNAMIC_PORTS],
    };
    return patched;
  }
  if (isGraphUtilityLogKind(withDisplay.kind)) {
    const parameterIds = new Set(withDisplay.parameters.map((parameter) => parameter.id));
    const overlay = GRAPH_UTILITY_LOG_PARAMETERS.filter(
      (parameter) => !parameterIds.has(parameter.id)
    );
    if (!overlay.length) return withDisplay;
    return { ...withDisplay, parameters: [...withDisplay.parameters, ...overlay] };
  }
  return withDisplay;
}

function isGraphSwitchKind(kind: string): boolean {
  return kind === 'core.flow.switch';
}

function isGraphUtilityLogKind(kind: string): boolean {
  return kind === 'core.utility.log';
}

/**
 * Deterministically kind-sorted manifest array acting as the `load()` payload of the
 * fixture catalogue source.
 */
export const GRAPH_NODE_MANIFEST_FIXTURES: GraphNodeManifest[] = [
  ...GRAPH_NODE_MANIFEST_FIXTURE_CONSTRUCTORS.map(compileManifest),
].sort((left, right) => left.kind.localeCompare(right.kind));

/**
 * P4 catalogue source backed by {@link GRAPH_NODE_MANIFEST_FIXTURES}. The graphs demo
 * page provides this source for `GRAPH_NODE_CATALOG_SOURCE` until the NestJS node
 * catalogue ships (P6).
 */
@Injectable({ providedIn: 'root' })
export class GraphNodeCatalogFixtureSource implements GraphNodeCatalogSource {
  async fetchManifests(): Promise<GraphNodeManifest[]> {
    return GRAPH_NODE_MANIFEST_FIXTURES;
  }

  async fetchManifest(kind: string): Promise<GraphNodeManifest | undefined> {
    return GRAPH_NODE_MANIFEST_FIXTURES.find((manifest) => manifest.kind === kind);
  }

  async resolveManifest(
    kind: string,
    instance: Pick<GraphNodeInstance, 'parameters' | 'metadata'>
  ): Promise<GraphResolvedNodeManifest> {
    const manifest = GRAPH_NODE_MANIFEST_FIXTURES.find((candidate) => candidate.kind === kind);
    if (!manifest) {
      throw new NotFoundError(`Node kind '${kind}' is not registered in the fixture node catalogue.`);
    }
    return resolveGraphNodeManifest(manifest, instance.parameters ?? {}, instance.metadata);
  }

  async invokeMethod(): Promise<GraphJsonValue> {
    throw new InternalError('Node method invocation is not available in the P4 fixture catalogue.');
  }
}

