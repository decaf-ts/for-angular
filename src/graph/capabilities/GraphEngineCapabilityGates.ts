/**
 * @module for-angular/graph/capabilities/GraphEngineCapabilityGates
 * @summary Capability-driven action gates for the graph UI (SAA-707).
 * @description Maps the served engine capability manifest onto the graph UI's
 * browse/create/edit/delete/run/stream/resume affordances. Every gate is
 * resolved from the selected engine's manifest rows through the pure alias matcher
 * in {@link ./GraphEngineCapability}; the UI never branches on the backend
 * flavour, so switching backends stays a configuration/selection change only.
 *
 * Verdict policy: an engine that explicitly declares a feature `NOT_SUPPORTED`
 * blocks the matching affordance (fail closed on an explicit refusal);
 * `SUPPORTED` and `EXTENSION_POINT` allow it; a feature the engine never
 * declares does not block, so a backend that simply does not mention an action
 * keeps the editor's existing behaviour instead of disabling a working control.
 */
import {
  GRAPH_ENGINE_WORKFLOW_LIST_FEATURE,
  GRAPH_ENGINE_WORKFLOW_LOOKUP_FEATURE,
  graphEngineFeatureVerdictOf,
  type GraphEngineDescriptor,
} from "./GraphEngineCapability";

/** Feature key declaring create-workflow (authoring) support. */
export const GRAPH_ENGINE_WORKFLOW_CREATE_FEATURE = "workflowCreate";

/** Feature key declaring edit/update-workflow support. */
export const GRAPH_ENGINE_WORKFLOW_UPDATE_FEATURE = "workflowUpdate";

/** Feature key declaring delete-workflow support. */
export const GRAPH_ENGINE_WORKFLOW_DELETE_FEATURE = "workflowDelete";

/** Feature key declaring workflow-run (execution) support. */
export const GRAPH_ENGINE_WORKFLOW_RUN_FEATURE = "workflowRun";

/** Feature key declaring live run-event streaming support. */
export const GRAPH_ENGINE_RUN_EVENTS_FEATURE = "runEventStream";

/** Feature key declaring suspend/resume support. */
export const GRAPH_ENGINE_WORKFLOW_RESUME_FEATURE = "workflowResume";

/**
 * Generic feature aliases the UI accepts per action, so a manifest that names the
 * capability differently still gates correctly. Aliases are generic English words,
 * never backend ids or flavour checks, so the mapping stays backend-agnostic.
 */
export const GRAPH_ENGINE_FEATURE_ALIASES = {
  /** Browse the engine workflow catalogue. */
  workflowList: [
    GRAPH_ENGINE_WORKFLOW_LIST_FEATURE,
    "listWorkflows",
    "list",
  ],
  /** Fetch one workflow document from the catalogue. */
  workflowLookup: [
    GRAPH_ENGINE_WORKFLOW_LOOKUP_FEATURE,
    "getWorkflow",
    "lookup",
  ],
  /** Create (author) a new workflow. */
  workflowCreate: [
    GRAPH_ENGINE_WORKFLOW_CREATE_FEATURE,
    "createWorkflow",
    "create",
  ],
  /** Edit/save an existing workflow. */
  workflowUpdate: [
    GRAPH_ENGINE_WORKFLOW_UPDATE_FEATURE,
    "updateWorkflow",
    "saveWorkflow",
    "save",
  ],
  /** Delete a workflow. */
  workflowDelete: [
    GRAPH_ENGINE_WORKFLOW_DELETE_FEATURE,
    "deleteWorkflow",
    "delete",
  ],
  /** Run (execute) a workflow. */
  workflowRun: [
    GRAPH_ENGINE_WORKFLOW_RUN_FEATURE,
    "runWorkflow",
    "executeWorkflow",
    "execute",
  ],
  /** Stream a run's live events. */
  runEventStream: [
    GRAPH_ENGINE_RUN_EVENTS_FEATURE,
    "runEvents",
    "eventStream",
    "events",
  ],
  /** Suspend/resume a run. */
  workflowResume: [
    GRAPH_ENGINE_WORKFLOW_RESUME_FEATURE,
    "resumeWorkflow",
    "suspendResume",
    "resume",
  ],
} as const;

/** A resolved affordance gate: `blocked` only on an explicit refusal. */
export type GraphEngineFeatureGate = "allowed" | "blocked";

/** The per-action gates the graph UI derives from the selected engine. */
export interface GraphEngineActionGates {
  /** Whether the engine workflow catalogue may be browsed. */
  browseWorkflows: boolean;
  /** Whether a workflow document may be fetched from the catalogue. */
  lookupWorkflow: boolean;
  /** Whether a workflow may be created. */
  createWorkflow: boolean;
  /** Whether a workflow may be edited/saved. */
  updateWorkflow: boolean;
  /** Whether a workflow may be deleted. */
  deleteWorkflow: boolean;
  /** Whether a workflow may be run. */
  runWorkflow: boolean;
  /** Whether a run's live events may be streamed. */
  streamRunEvents: boolean;
  /** Whether a run may be resumed. */
  resumeWorkflow: boolean;
}

/**
 * Resolves an affordance gate from the engine's declared verdicts. Only an
 * explicit `NOT_SUPPORTED` blocks; `SUPPORTED`, `EXTENSION_POINT`, and an
 * undeclared feature all allow the affordance.
 *
 * @param engine - The engine descriptor to inspect, if one is selected.
 * @param aliases - Acceptable aliases of the queried feature.
 * @return The resolved gate.
 */
export function graphEngineFeatureGateOf(
  engine: Pick<GraphEngineDescriptor, "capabilities"> | undefined,
  aliases: readonly string[],
): GraphEngineFeatureGate {
  return graphEngineFeatureVerdictOf(engine, aliases) === "NOT_SUPPORTED"
    ? "blocked"
    : "allowed";
}

/**
 * Whether the engine allows an affordance by alias.
 *
 * @param engine - The engine descriptor to inspect, if one is selected.
 * @param aliases - Acceptable aliases of the queried feature.
 * @return {boolean} `true` unless the engine explicitly declares it unsupported.
 */
export function graphEngineFeatureAllowed(
  engine: Pick<GraphEngineDescriptor, "capabilities"> | undefined,
  aliases: readonly string[],
): boolean {
  return graphEngineFeatureGateOf(engine, aliases) === "allowed";
}

/**
 * Projects every graph-UI action gate from the selected engine's manifest rows.
 *
 * @param engine - The engine descriptor to inspect, if one is selected.
 * @return {GraphEngineActionGates} The resolved per-action gates.
 */
export function graphEngineActionGatesOf(
  engine: Pick<GraphEngineDescriptor, "capabilities"> | undefined,
): GraphEngineActionGates {
  const aliases = GRAPH_ENGINE_FEATURE_ALIASES;
  return {
    browseWorkflows: graphEngineFeatureAllowed(
      engine,
      aliases.workflowList,
    ),
    lookupWorkflow: graphEngineFeatureAllowed(
      engine,
      aliases.workflowLookup,
    ),
    createWorkflow: graphEngineFeatureAllowed(
      engine,
      aliases.workflowCreate,
    ),
    updateWorkflow: graphEngineFeatureAllowed(
      engine,
      aliases.workflowUpdate,
    ),
    deleteWorkflow: graphEngineFeatureAllowed(
      engine,
      aliases.workflowDelete,
    ),
    runWorkflow: graphEngineFeatureAllowed(engine, aliases.workflowRun),
    streamRunEvents: graphEngineFeatureAllowed(
      engine,
      aliases.runEventStream,
    ),
    resumeWorkflow: graphEngineFeatureAllowed(
      engine,
      aliases.workflowResume,
    ),
  };
}
