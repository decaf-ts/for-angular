/** @module for-angular/graph/validation/GraphWorkflowValidityStore
 * @summary Singleton signal store for editor-projected workflow validity (DECAF-50 D5/§4.22).
 * @description Holds the editor's validity projection over the canonical
 * document: the backend validation status, the structured
 * {@link GraphValidationIssue}s, and the node/edge ids they touch. The toolbar
 * gates Run on {@link isInvalid}, the canvas projects `--invalid`, and the right
 * pane renders the structured issues (G3-16..G3-18).
 *
 * The store is a pure signal projection; it performs no HTTP itself. The renderer
 * feeds it continuously (document-version driven) and the page re-validates it
 * before a run, both through {@link validate}, which delegates to the injected
 * {@link GraphWorkflowValidateClient}.
 */
import { computed, signal } from '@angular/core';
import type { GraphWorkflowDocument } from '@decaf-ts/ui-decorators/graph';
import { graphWorkflowDocumentSemanticHashOf } from '../document/GraphDocumentSelectors';
import { graphRunLog } from '../execution/GraphRunLogStore';
import type {
  GraphValidationIssue,
  GraphWorkflowValidationResult,
} from './GraphWorkflowValidateClient';

/** Editor validity lifecycle (D5): `idle` before the first check, `checking`
 *  while the backend validates, `valid`/`invalid` from the backend result, and
 *  `unavailable` when the backend could not be reached. */
export type GraphWorkflowValidityStatus =
  | 'idle'
  | 'checking'
  | 'valid'
  | 'invalid'
  | 'unavailable';

/**
 * Readable label for a validity status (the right-pane projection, G3-18).
 * @param status The current validity lifecycle status.
 */
export function graphWorkflowValidityLabelOf(
  status: GraphWorkflowValidityStatus
): string {
  switch (status) {
    case 'valid':
      return 'Valid';
    case 'invalid':
      return 'Invalid';
    case 'checking':
      return 'Checking…';
    case 'unavailable':
      return 'Unavailable';
    default:
      return 'Not validated';
  }
}

/**
 * Signal store for the editor's validity projection (D5, DECAF-50 §4.22):
 * the backend validation result, the structured issues, and the derived
 * invalid node/edge ids the canvas and node faces highlight.
 */
class GraphWorkflowValidityStore {
  /** Current validity lifecycle status (D5). */
  readonly status = signal<GraphWorkflowValidityStatus>('idle');
  /** Structured issues from the last completed validation (D5/G3-16). */
  readonly issues = signal<GraphValidationIssue[]>([]);
  /** Semantic hash of the document the last result belongs to. */
  readonly semanticHash = signal<string | null>(null);
  /** Transport/lifecycle failure message, when the backend was unreachable. */
  readonly error = signal<string | null>(null);

  /** Consecutive validation request sequence; stale responses are dropped. */
  private requestSequence = 0;

  /** Readable label of the current validity status (G3-18). */
  readonly label = computed(() => graphWorkflowValidityLabelOf(this.status()));

  /**
   * Whether the projected graph is positively invalid. While a re-check is in
   * flight the previous issues keep Run blocked, so an invalid graph can never be
   * submitted during the validation window (D5).
   */
  readonly isInvalid = computed(
    () => this.status() === 'invalid' || (this.status() === 'checking' && this.issues().length > 0)
  );

  /** Whether the last completed validation passed (D5). */
  readonly isValid = computed(() => this.status() === 'valid');

  /** Node ids carrying at least one validation issue (canvas invalid state). */
  readonly invalidNodeIds = computed<ReadonlySet<string>>(() => {
    const ids = new Set<string>();
    for (const issue of this.issues()) {
      if (issue.nodeId) ids.add(issue.nodeId);
    }
    return ids;
  });

  /** Edge ids carrying at least one validation issue (canvas invalid state). */
  readonly invalidEdgeIds = computed<ReadonlySet<string>>(() => {
    const ids = new Set<string>();
    for (const issue of this.issues()) {
      if (issue.edgeId) ids.add(issue.edgeId);
    }
    return ids;
  });

  /**
   * Applies a completed validation result (D5): records the result's document
   * semantic hash so a subsequent identical document can be skipped.
   * @param result The backend validation result.
   */
  applyResult(result: GraphWorkflowValidationResult): void {
    this.error.set(null);
    this.issues.set(result.issues ?? []);
    this.status.set(result.valid ? 'valid' : 'invalid');
  }

  /**
   * Records a validation transport/lifecycle failure (D5): the graph is not
   * known to be invalid, so Run stays gated on backend availability instead.
   * @param error The failure surfaced by the validate client.
   */
  applyFailure(error: unknown): void {
    this.error.set(error instanceof Error ? error.message : String(error));
    this.issues.set([]);
    this.status.set('unavailable');
  }

  /**
   * Validates a canonical document through the injected client and projects the
   * result. Stale responses (superseded by a newer request) are dropped so the
   * projection always reflects the newest document version.
   *
   * This is the Run gate's validation, so it also feeds the run-lifecycle lines
   * into the log drawer (D6/G3-21): a validated graph, or the structured
   * issues that block the run. The renderer's continuous projection goes through
   * {@link validateIfChanged} instead, so editor-only checks never log a
   * run-lifecycle line.
   * @param document The document to validate.
   * @param client The validate client to delegate to.
   * @returns The validation result, or `null` when the request was superseded.
   */
  async validate(
    document: GraphWorkflowDocument,
    client: { validate(document: GraphWorkflowDocument): Promise<GraphWorkflowValidationResult> }
  ): Promise<GraphWorkflowValidationResult | null> {
    const result = await this.requestValidation(document, client);
    this.recordRunLifecycle(document, result);
    return result;
  }

  /**
   * Re-validates only when the document's semantic hash changed since the last
   * completed check (the renderer's continuous projection). Returns the cached
   * result when the document is semantically unchanged, so layout-only edits
   * never re-hit the backend. Does not feed run-lifecycle lines: only the page's
   * Run gate ({@link validate}) reports the run's validation.
   * @param document The document to validate.
   * @param client The validate client to delegate to.
   */
  async validateIfChanged(
    document: GraphWorkflowDocument,
    client: { validate(document: GraphWorkflowDocument): Promise<GraphWorkflowValidationResult> }
  ): Promise<GraphWorkflowValidationResult | null> {
    const hash = graphWorkflowDocumentSemanticHashOf(document);
    if (this.semanticHash() === hash && this.status() !== 'idle') return null;
    return this.requestValidation(document, client);
  }

  /**
   * Runs one validation request and projects its result, dropping stale responses
   * (superseded by a newer request).
   * @param document The document to validate.
   * @param client The validate client to delegate to.
   * @returns The validation result, or `null` when the request was superseded.
   */
  private async requestValidation(
    document: GraphWorkflowDocument,
    client: { validate(document: GraphWorkflowDocument): Promise<GraphWorkflowValidationResult> }
  ): Promise<GraphWorkflowValidationResult | null> {
    const requestId = ++this.requestSequence;
    const hash = graphWorkflowDocumentSemanticHashOf(document);
    this.status.set('checking');
    try {
      const result = await client.validate(document);
      if (requestId !== this.requestSequence) return null;
      this.semanticHash.set(hash);
      this.applyResult(result);
      return result;
    } catch (error) {
      if (requestId !== this.requestSequence) return null;
      this.semanticHash.set(hash);
      this.applyFailure(error);
      return null;
    }
  }

  /**
   * Feeds the run-lifecycle validation lines into the log drawer (D6/G3-21):
   * a validated graph logs a `validated` line; an invalid graph logs a
   * `validation-issues` line; an unreachable backend logs that validation
   * could not complete. Superseded requests (`null`) log nothing.
   * @param document The validated document.
   * @param result The validation result, or `null` when superseded.
   */
  private recordRunLifecycle(
    document: GraphWorkflowDocument,
    result: GraphWorkflowValidationResult | null
  ): void {
    if (!result) return;
    const workflowId = document.id;
    if (result.valid) {
      graphRunLog.recordLifecycle(
        'validated',
        `Workflow ${workflowId} validated`,
        { workflowId }
      );
      return;
    }
    const count = result.issues?.length ?? 0;
    graphRunLog.recordLifecycle(
      'validation-issues',
      `Workflow ${workflowId} validation reported ${count} issue(s)`,
      { workflowId }
    );
  }

  /** Clears the projection back to its unvalidated state. */
  reset(): void {
    this.requestSequence += 1;
    this.status.set('idle');
    this.issues.set([]);
    this.semanticHash.set(null);
    this.error.set(null);
  }
}

/** Singleton shared by the renderer projection, toolbar gate, and page pre-run gate. */
export const graphValidity = new GraphWorkflowValidityStore();
