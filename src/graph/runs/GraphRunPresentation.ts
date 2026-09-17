/**
 * @module for-angular/graph/runs/GraphRunPresentation
 * @summary Human-readable run presentation messages (DECAF-50 §4.23 G3-34/G3-35).
 * @description Pure message builders for the run-lifecycle affordances that were
 * previously developer-grade or absent: the stuck-run timeout notice (G3-34) and the
 * document round-trip drift message (G3-35). Kept free of Angular and HTTP so the
 * demo UI's wording is unit-testable.
 */

/**
 * Default stuck-run timeout (ms): a run that produced no terminal event within
 * this window is treated as stuck and is cancelled (G3-34).
 */
export const GRAPH_RUN_STUCK_TIMEOUT_MS = 60_000;

/**
 * Builds the human-readable document round-trip drift message (G3-35). The demo
 * UI never shows raw hashes to the user; the run id is the support reference.
 * @param runId The run whose stored document drifted.
 * @param submittedHash The semantic hash of the submitted document.
 * @param returnedHash The semantic hash of the stored document.
 * @returns The user-facing drift message.
 */
export function graphRunDriftMessageOf(
  runId: string,
  submittedHash: string,
  returnedHash: string
): string {
  return (
    `This run's stored workflow differs from the one that was submitted, so its ` +
    `results may not match the editor. Reload the page and run again. ` +
    `(Run ${runId}; submitted ${submittedHash.slice(0, 12)}… vs stored ${returnedHash.slice(0, 12)}…)`
  );
}

/**
 * Builds the stuck-run timeout message (G3-34): the run exceeded the
 * {@link GRAPH_RUN_STUCK_TIMEOUT_MS} window without a terminal event and is
 * being cancelled.
 * @param runId The stuck run's id.
 * @param timeoutMs The elapsed timeout window in milliseconds.
 * @returns The user-facing stuck-run message.
 */
export function graphRunStuckMessageOf(runId: string, timeoutMs: number): string {
  return (
    `Run '${runId}' produced no terminal event within ${Math.round(timeoutMs / 1000)}s, ` +
    `so it was cancelled. Start it again.`
  );
}

/**
 * Builds the run-cancel failure message (G3-34): the cancel request itself
 * failed, so the user knows the run may still be live.
 * @param runId The run whose cancellation failed.
 * @param error The failure thrown by the cancel request.
 * @returns The user-facing cancel-failure message.
 */
export function graphRunCancelFailureMessageOf(runId: string, error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  return `Could not cancel run '${runId}': ${detail}`;
}
