/**
 * @module for-angular/graph/execution/GraphRunLogStore.spec
 * @summary Unit tests for the run log signal store (DECAF-48 §4.5/Req-4).
 */
import type { GraphRunLogEntry, LogNodeLevel } from '@decaf-ts/integrations/graph/shared';

import {
  GRAPH_LOG_FILTER_LABELS,
  GRAPH_LOG_FILTER_THRESHOLD,
  graphRunLog,
} from './GraphRunLogStore';

function entry(level: LogNodeLevel | 'benchmark', message = `msg-${level}`, ts = '2024-01-01T00:00:00.000Z'): GraphRunLogEntry {
  return { level, message, timestamp: ts, runId: 'r1', workflowId: 'w1', nodeId: 'SplitTextCodeNode', user: 'alice' };
}

describe('GraphRunLogStore', () => {
  beforeEach(() => {
    graphRunLog.reset();
  });

  afterEach(() => {
    graphRunLog.reset();
  });

  it('appends a single entry and exposes it through entries()', () => {
    graphRunLog.append(entry('info'));
    expect(graphRunLog.entries()).toHaveLength(1);
    expect(graphRunLog.entries()[0]).toMatchObject({ level: 'info', message: 'msg-info' });
  });

  it('appendAll adds many entries preserving insertion order', () => {
    graphRunLog.appendAll([entry('silly', 'first'), entry('info', 'second'), entry('error', 'third')]);
    expect(graphRunLog.entries().map((e) => e.message)).toEqual(['first', 'second', 'third']);
  });

  it('appendAll ignores empty batches (no signal churn)', () => {
    graphRunLog.append(entry('info'));
    graphRunLog.appendAll([]);
    expect(graphRunLog.entries()).toHaveLength(1);
  });

  it('keeps interleaved append/appendAll ordering', () => {
    graphRunLog.append(entry('info', 'a'));
    graphRunLog.appendAll([entry('info', 'b'), entry('info', 'c')]);
    graphRunLog.append(entry('info', 'd'));
    expect(graphRunLog.entries().map((e) => e.message)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('caps entries at 500 keeping the most recent (FIFO) on append overflow', () => {
    for (let i = 0; i < 510; i += 1) {
      graphRunLog.append(entry('debug', `line-${i}`));
    }
    expect(graphRunLog.entries()).toHaveLength(500);
    expect(graphRunLog.entries()[0].message).toBe('line-10');
    expect(graphRunLog.entries()[499].message).toBe('line-509');
  });

  it('caps total at 500 on appendAll overflow', () => {
    graphRunLog.appendAll(Array.from({ length: 250 }, (_, i) => entry('debug', `pre-${i}`)));
    graphRunLog.appendAll(Array.from({ length: 400 }, (_, i) => entry('debug', `post-${i}`)));
    expect(graphRunLog.entries()).toHaveLength(500);
    expect(graphRunLog.entries()[0].message).toBe('pre-150');
    expect(graphRunLog.entries()[499].message).toBe('post-399');
  });

  it('visibleEntries returns everything at verbose threshold', () => {
    const levels: (LogNodeLevel | 'benchmark')[] = ['silly', 'trace', 'debug', 'verbose', 'info', 'warn', 'error', 'critical', 'fatal'];
    graphRunLog.appendAll(levels.map((level) => entry(level)));
    graphRunLog.setFilter('verbose');
    expect(graphRunLog.visibleEntries()).toHaveLength(9);
  });

  it('visibleEntries hides noisy debug levels at info threshold (Chrome console semantics)', () => {
    graphRunLog.appendAll(['silly', 'trace', 'debug', 'verbose', 'info', 'warn'].map((level) => entry(level as LogNodeLevel)));
    graphRunLog.setFilter('info');
    const visible = graphRunLog.visibleEntries().map((e) => e.level);
    expect(visible).toEqual(['verbose', 'info', 'warn']);
  });

  it('visibleEntries keeps warn and above at warn threshold', () => {
    graphRunLog.appendAll((['info', 'warn', 'error', 'critical', 'fatal'] as LogNodeLevel[]).map((level) => entry(level)));
    graphRunLog.setFilter('warn');
    const visible = graphRunLog.visibleEntries().map((e) => e.level);
    expect(visible).toEqual(['warn', 'error', 'critical', 'fatal']);
  });

  it('visibleEntries shows only errors at error threshold', () => {
    graphRunLog.appendAll((['warn', 'error', 'critical', 'fatal', 'info'] as LogNodeLevel[]).map((level) => entry(level)));
    graphRunLog.setFilter('error');
    const visible = graphRunLog.visibleEntries().map((e) => e.level);
    expect(visible).toEqual(['error', 'critical', 'fatal']);
  });

  it('treats benchmark with info-equivalent severity (info filter keeps it, warn hides it)', () => {
    graphRunLog.appendAll([entry('benchmark', 'bm'), entry('info', 'n')]);
    graphRunLog.setFilter('info');
    expect(graphRunLog.visibleEntries().map((e) => e.message)).toContain('bm');
    graphRunLog.setFilter('warn');
    expect(graphRunLog.visibleEntries().map((e) => e.message)).not.toContain('bm');
  });

  it('filtering never drops entries from the stream (view concern only)', () => {
    graphRunLog.appendAll(['debug', 'info', 'error'].map((level) => entry(level as LogNodeLevel)));
    graphRunLog.setFilter('error');
    expect(graphRunLog.visibleEntries()).toHaveLength(1);
    expect(graphRunLog.entries()).toHaveLength(3);
    graphRunLog.setFilter('verbose');
    expect(graphRunLog.visibleEntries()).toHaveLength(3);
  });

  it('counts reports total, warnings and errors (severity >=5 / >=6)', () => {
    graphRunLog.appendAll([
      entry('debug'),
      entry('info'),
      entry('warn'),
      entry('error'),
      entry('critical'),
    ]);
    expect(graphRunLog.counts()).toEqual({ total: 5, warnings: 3, errors: 2 });
  });

  it('clear empties the entry stream but keeps the active filter', () => {
    graphRunLog.appendAll([entry('debug'), entry('info')]);
    graphRunLog.setFilter('info');
    graphRunLog.clear();
    expect(graphRunLog.entries()).toHaveLength(0);
    expect(graphRunLog.visibleEntries()).toHaveLength(0);
    expect(graphRunLog.filter()).toBe('info');
  });

  it('open flag tracks visibility and opening expands the console', () => {
    expect(graphRunLog.open()).toBe(false);
    graphRunLog.setOpen(true);
    expect(graphRunLog.open()).toBe(true);
    expect(graphRunLog.collapsed()).toBe(false);
    graphRunLog.setCollapsed(true);
    graphRunLog.setOpen(false);
    expect(graphRunLog.open()).toBe(false);
  });

  it('reset clears entries, filter, open and collapsed state', () => {
    graphRunLog.appendAll([entry('error')]);
    graphRunLog.setFilter('warn');
    graphRunLog.setOpen(true);
    graphRunLog.setCollapsed(true);

    graphRunLog.reset();
    expect(graphRunLog.entries()).toHaveLength(0);
    expect(graphRunLog.filter()).toBe('verbose');
    expect(graphRunLog.open()).toBe(false);
    expect(graphRunLog.collapsed()).toBe(false);
  });

  it('exposes console-style filter labels and thresholds', () => {
    expect(GRAPH_LOG_FILTER_LABELS).toEqual({
      verbose: 'Verbose',
      info: 'Info',
      warn: 'Warnings',
      error: 'Errors',
    });
    expect(GRAPH_LOG_FILTER_THRESHOLD).toEqual({ verbose: 0, info: 3, warn: 5, error: 6 });
  });
});
