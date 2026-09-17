/**
 * @module for-angular/graph/runs/GraphRunPresentation.spec
 * @summary PR-H run-presentation contract (DECAF-50 §4.23 G3-34/G3-35).
 * @description Proves the run-lifecycle messages are human-readable: the
 * document round-trip drift message never surfaces a bare hash as the primary text,
 * and the stuck-run / cancel-failure messages name the run and the remedy.
 */
import {
  GRAPH_RUN_STUCK_TIMEOUT_MS,
  graphRunCancelFailureMessageOf,
  graphRunDriftMessageOf,
  graphRunStuckMessageOf,
} from './GraphRunPresentation';

describe('graph run presentation messages (G3-34/G3-35)', () => {
  it('builds a human-readable drift message with the run id and truncated hashes', () => {
    const message = graphRunDriftMessageOf(
      'run-7',
      'abcdef0123456789abcdef',
      'fedcba9876543210fedcba'
    );

    expect(message).toContain('stored workflow differs');
    expect(message).toContain('Reload the page and run again');
    expect(message).toContain('run-7');
    expect(message).toContain('abcdef012345');
    expect(message).toContain('fedcba987654');
    // The raw full hash is never the message itself.
    expect(message).not.toBe('abcdef0123456789abcdef');
  });

  it('builds a stuck-run message naming the window and the remedy', () => {
    const message = graphRunStuckMessageOf('run-9', 30_000);

    expect(message).toContain("Run 'run-9'");
    expect(message).toContain('30s');
    expect(message).toContain('cancelled');
  });

  it('exposes a 60s default stuck-run timeout', () => {
    expect(GRAPH_RUN_STUCK_TIMEOUT_MS).toBe(60_000);
  });

  it('builds a cancel-failure message carrying the underlying detail', () => {
    const message = graphRunCancelFailureMessageOf('run-3', new Error('network down'));

    expect(message).toContain("Could not cancel run 'run-3'");
    expect(message).toContain('network down');
  });

  it('stringifies non-Error cancel failures', () => {
    expect(graphRunCancelFailureMessageOf('run-4', 'boom')).toContain('boom');
  });
});
