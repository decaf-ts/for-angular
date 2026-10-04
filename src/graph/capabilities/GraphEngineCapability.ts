/**
 * @module for-angular/graph/capabilities/GraphEngineCapability
 * @summary Manifest contract and feature-verdict helpers for served engine
 * capabilities (SAA-197 / Deliverable 3).
 * @description Pure contract layer over the backend's engine capability
 * manifest: the descriptor/manifest shapes, the feature-verdict vocabulary, the
 * `workflowList`/`workflowLookup` feature keys, and alias-matching helpers that
 * resolve whether the selected engine supports a feature. No I/O and no Angular
 * dependencies — the API client, store, and service live in sibling files.
 */
import type { GraphWorkflowDocument } from "@decaf-ts/as-graph/shared";

/**
 * Whether a served engine declares a feature supported, not supported, or only
 * reachable through an extension point.
 */
export type GraphEngineFeatureVerdict =
  | "SUPPORTED"
  | "NOT_SUPPORTED"
  | "EXTENSION_POINT";

/** One feature/verdict row of an engine descriptor. */
export interface GraphEngineFeature {
  /** The engine feature name as served by the backend. */
  feature: string;
  /** The declared verdict for the feature. */
  verdict: GraphEngineFeatureVerdict;
  /** Human-readable detail for the verdict, when provided. */
  detail?: string;
}

/** One engine entry of the served capability manifest. */
export interface GraphEngineDescriptor {
  /** The canonical engine id (the backend flavour). */
  engineId: string;
  /** Human-readable engine name for the picker/toolbar. */
  displayName: string;
  /** Whether the engine executes locally, as served by the backend. */
  local: boolean;
  /** The engine version pin reported by the backend. */
  pinnedEngineVersion: string;
  /** The declared feature/verdict rows of the engine. */
  capabilities: GraphEngineFeature[];
}

/** The served engine capability manifest (C20). */
export interface GraphEngineCapabilityManifest {
  /** All engines the backend advertises. */
  engines: GraphEngineDescriptor[];
  /** The backend-preferred default engine id. */
  defaultEngineId: string;
}

/** One workflow listed by an engine's workflow catalogue. */
export interface GraphEngineWorkflowSummary {
  /** The canonical workflow id. */
  workflowId: string;
  /** The workflow display name, when served. */
  name?: string;
  /** The last-update timestamp, when served. */
  updatedAt?: string;
}

/** A workflow the user picked from an engine's catalogue, ready to run. */
export interface GraphEngineWorkflowSelection {
  /** The engine the workflow was loaded from. */
  engineId: string;
  /** The catalogue summary of the picked workflow. */
  summary: GraphEngineWorkflowSummary;
  /** The resolved canonical document of the picked workflow. */
  document: GraphWorkflowDocument;
}

/** The known verdict values, for runtime validation. */
export const GRAPH_ENGINE_FEATURE_VERDICTS: readonly GraphEngineFeatureVerdict[] =
  ["SUPPORTED", "NOT_SUPPORTED", "EXTENSION_POINT"];

/** Feature key declaring workflow listing (browse) support. */
export const GRAPH_ENGINE_WORKFLOW_LIST_FEATURE = "workflowList";

/** Feature key declaring workflow lookup (fetch document) support. */
export const GRAPH_ENGINE_WORKFLOW_LOOKUP_FEATURE = "workflowLookup";

/**
 * Runtime check for a feature-verdict value.
 *
 * @param value - The value to test.
 * @return {boolean} `true` when the value is a known verdict string.
 */
export function isGraphEngineFeatureVerdict(
  value: unknown,
): value is GraphEngineFeatureVerdict {
  return (
    typeof value === "string" &&
    (GRAPH_ENGINE_FEATURE_VERDICTS as readonly string[]).includes(value)
  );
}

/**
 * Runtime check for one capability row of an engine descriptor.
 *
 * @param value - The value to test.
 * @return {boolean} `true` when the value is a feature row with a non-empty
 *   feature name and a known verdict.
 */
export function isGraphEngineFeature(
  value: unknown,
): value is GraphEngineFeature {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record["feature"] === "string" &&
    record["feature"].length > 0 &&
    isGraphEngineFeatureVerdict(record["verdict"])
  );
}

/**
 * Normalises a feature name to its comparable key (lowercase alphanumerics).
 *
 * @param feature - The raw feature name.
 * @return {string} The normalised feature key.
 */
export function graphEngineFeatureKeyOf(feature: string): string {
  return feature
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Whether a served feature name matches a queried alias, both normalised to
 * comparable keys. Aliases shorter than three characters never match.
 *
 * @param feature - The served feature name.
 * @param alias - The queried feature alias.
 * @return {boolean} `true` when either normalised key contains the other.
 */
export function graphEngineFeatureMatches(
  feature: string,
  alias: string,
): boolean {
  const featureKey = graphEngineFeatureKeyOf(feature);
  const aliasKey = graphEngineFeatureKeyOf(alias);
  if (!featureKey || aliasKey.length < 3) return false;
  return featureKey.includes(aliasKey) || aliasKey.includes(featureKey);
}

/**
 * Resolves the verdict an engine declares for any of the queried aliases.
 * The first matching `SUPPORTED` row wins; otherwise the first non-supported
 * verdict encountered is returned as the honest fallback.
 *
 * @param engine - The engine descriptor to inspect, if one is selected.
 * @param aliases - Acceptable aliases of the queried feature.
 * @return The resolved verdict, or `undefined` when nothing matches.
 */
export function graphEngineFeatureVerdictOf(
  engine: Pick<GraphEngineDescriptor, "capabilities"> | undefined,
  aliases: readonly string[],
): GraphEngineFeatureVerdict | undefined {
  if (!engine) return undefined;
  let fallback: GraphEngineFeatureVerdict | undefined;
  for (const capability of engine.capabilities ?? []) {
    if (!isGraphEngineFeature(capability)) continue;
    if (
      !aliases.some((alias) =>
        graphEngineFeatureMatches(capability.feature, alias),
      )
    ) {
      continue;
    }
    if (capability.verdict === "SUPPORTED") return "SUPPORTED";
    if (fallback === undefined) fallback = capability.verdict;
  }
  return fallback;
}

/**
 * Whether the engine declares every queried alias `SUPPORTED` (single alias
 * in practice). Alias matching follows {@link graphEngineFeatureMatches}.
 *
 * @param engine - The engine descriptor to inspect, if one is selected.
 * @param aliases - Acceptable aliases of the queried feature.
 * @return {boolean} `true` when the feature resolves to `SUPPORTED`.
 */
export function graphEngineSupportsFeature(
  engine: Pick<GraphEngineDescriptor, "capabilities"> | undefined,
  ...aliases: string[]
): boolean {
  return graphEngineFeatureVerdictOf(engine, aliases) === "SUPPORTED";
}
