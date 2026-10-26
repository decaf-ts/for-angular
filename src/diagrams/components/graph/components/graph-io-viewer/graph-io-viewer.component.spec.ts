/**
 * @module for-angular/graph/components/graph-io-viewer/graph-io-viewer.component.spec
 * @summary SAA-722 node I/O viewer cap + download contract, extended with the
 * SAA-797 F1/F3/F4 security-remediation contract and the SAA-1432 R1/R2/R3/R4
 * residual-cap contract.
 * @description Proves the reusable node I/O viewer caps its rendered payload
 * (byte cap first, then line cap) per field and per table cell, exposes the
 * truncation affordances, and downloads the full untruncated payload from the
 * run detail endpoint. SAA-797 adds: a silent-truncated-download guard (only a
 * network-class fetch failure falls back, and the fallback download is marked;
 * any other error downloads nothing and surfaces the error) and filename
 * sanitization of the field/node id download anchor. SAA-1432 adds: capped table
 * row keys with a unique render identity (R1), one aggregate UTF-8 byte budget
 * shared by all visible rows (R2), a namespaced truncation marker that cannot
 * collide with a real payload key (R3), and narrowing of `TypeError` to
 * transport-shaped messages so a client bug is not treated as a network failure
 * (R4).
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  GRAPH_IO_TRUNCATED_MARKER,
  GraphIoViewerComponent,
  graphIoCapText,
  isNetworkClassError,
  markDownloadFallback,
  sanitizeFilenameSegment,
  type GraphIoViewerField,
} from './graph-io-viewer.component';
import {
  GRAPH_IO_PANEL_LIMIT,
  type GraphIoPanelLimit,
} from '../../tokens/graph-configuration.tokens';
import { GraphRunClient } from '../../runs/GraphRunClient';

/** Reads a Blob's text content through the jsdom FileReader implementation. */
function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe('graphIoCapText (SAA-722)', () => {
  it('returns the full text unchanged when it is under both caps', () => {
    const text = 'hello\nworld';
    const result = graphIoCapText(text, { bytes: 1000, lines: 100 });

    expect(result.text).toBe(text);
    expect(result.truncated).toBe(false);
  });

  it('does not flag truncation when the byte count exactly equals the cap', () => {
    const result = graphIoCapText('abc', { bytes: 3, lines: 100 });

    expect(result.text).toBe('abc');
    expect(result.truncated).toBe(false);
  });

  it('applies the byte cap and flags truncation when the payload is too large', () => {
    const result = graphIoCapText('abcdef', { bytes: 3, lines: 100 });

    expect(result.text).toBe('abc');
    expect(result.truncated).toBe(true);
  });

  it('applies the line cap and flags truncation when there are too many lines', () => {
    const result = graphIoCapText('a\nb\nc\nd', { bytes: 1000, lines: 2 });

    expect(result.text).toBe('a\nb');
    expect(result.truncated).toBe(true);
  });

  it('applies the byte cap first, then the line cap on the byte-capped text', () => {
    // 'one\ntwo\nthree\nfour\nfive' -> byte cap 11 keeps 'one\ntwo\nthr' (3 lines)
    // -> line cap 2 then drops the third line.
    const result = graphIoCapText('one\ntwo\nthree\nfour\nfive', {
      bytes: 11,
      lines: 2,
    });

    expect(result.text).toBe('one\ntwo');
    expect(result.truncated).toBe(true);
  });

  it('never mutates the source text', () => {
    const source = 'a\nb\nc\nd';
    graphIoCapText(source, { bytes: 2, lines: 1 });

    expect(source).toBe('a\nb\nc\nd');
  });

  it('reports the UTF-8 byte length of a plain ASCII payload (SAA-1432 R2)', () => {
    const result = graphIoCapText('abcdef', { bytes: 1000, lines: 100 });

    expect(result.bytes).toBe(6);
  });

  it('reports UTF-8 byte length, not string length, for a multi-byte payload (SAA-1432 R2)', () => {
    const result = graphIoCapText('éé', { bytes: 1000, lines: 100 });

    expect(result.text).toBe('éé');
    expect(result.bytes).toBe(4);
  });

  it('reports the capped byte length when the byte cap binds (SAA-1432 R2)', () => {
    const result = graphIoCapText('abcdef', { bytes: 3, lines: 100 });

    expect(result.text).toBe('abc');
    expect(result.bytes).toBe(3);
  });
});

describe('isNetworkClassError (SAA-797 F3)', () => {
  it('is true for the graph backend unavailability error', () => {
    const error = new Error('down');
    error.name = 'GraphBackendUnavailableError';

    expect(isNetworkClassError(error)).toBe(true);
  });

  it.each(['NetworkError', 'AbortError', 'TimeoutError'])(
    'is true for a %s error',
    (name) => {
      const error = new Error('x');
      error.name = name;

      expect(isNetworkClassError(error)).toBe(true);
    },
  );

  it('is false for a bare TypeError with no transport message (SAA-1432 R4)', () => {
    const error = new Error('x');
    error.name = 'TypeError';

    expect(isNetworkClassError(error)).toBe(false);
  });

  it.each([
    'fetch failed',
    'Failed to fetch',
    'NetworkError when attempting to fetch resource.',
    'Load failed',
    'Network request failed',
    'socket hang up',
    'net::ERR_CONNECTION_REFUSED',
    'connect ETIMEDOUT 10.0.0.1:443',
  ])(
    'is true for a TypeError carrying a transport message: %p (SAA-1432 R4)',
    (message) => {
      expect(isNetworkClassError(new TypeError(message))).toBe(true);
    },
  );

  it.each([
    "Cannot read properties of undefined (reading 'x')",
    // A professional `timeout` message is deliberately not a transport shape:
    // a client bug reading a `.timeout` property must not be misclassified.
    "Cannot read properties of undefined (reading 'timeout')",
  ])('is false for a client-bug TypeError: %p (SAA-1432 R4)', (message) => {
    expect(isNetworkClassError(new TypeError(message))).toBe(false);
  });

  it.each([
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ETIMEDOUT',
    'ENETUNREACH',
    'ERR_NETWORK',
  ])('is true for a %s error code', (code) => {
    expect(isNetworkClassError(Object.assign(new Error('x'), { code }))).toBe(
      true,
    );
  });

  it('is false for a plain Error (not network-class)', () => {
    expect(isNetworkClassError(new Error('boom'))).toBe(false);
  });

  it('is false for a non-Error rejection value', () => {
    expect(isNetworkClassError('nope')).toBe(false);
  });

  it('is false for an unrelated error code', () => {
    expect(
      isNetworkClassError(Object.assign(new Error('x'), { code: 'ERR_BAD' })),
    ).toBe(false);
  });
});

describe('markDownloadFallback (SAA-797 F3)', () => {
  it('merges the marker into a record payload', () => {
    expect(markDownloadFallback({ a: 1 })).toEqual({
      a: 1,
      [GRAPH_IO_TRUNCATED_MARKER]: true,
    });
  });

  it('wraps a non-record payload in a marker envelope', () => {
    expect(markDownloadFallback('plain')).toEqual({
      [GRAPH_IO_TRUNCATED_MARKER]: true,
      value: 'plain',
    });
  });

  it('wraps an array payload rather than annotating it', () => {
    expect(markDownloadFallback([1, 2])).toEqual({
      [GRAPH_IO_TRUNCATED_MARKER]: true,
      value: [1, 2],
    });
  });

  it('does not mutate the source payload', () => {
    const source = { a: 1 };
    markDownloadFallback(source);

    expect(source).toEqual({ a: 1 });
  });

  it('uses the namespaced truncation marker (SAA-1432 R3)', () => {
    expect(GRAPH_IO_TRUNCATED_MARKER).toBe('__graphIoTruncated');
  });

  it('keeps a real _truncated payload key and adds the namespaced marker (SAA-1432 R3)', () => {
    const marked = markDownloadFallback({
      _truncated: 'a real payload field',
      a: 1,
    }) as Record<string, unknown>;

    expect(marked['_truncated']).toBe('a real payload field');
    expect(marked[GRAPH_IO_TRUNCATED_MARKER]).toBe(true);
    expect(marked).toEqual({
      _truncated: 'a real payload field',
      a: 1,
      __graphIoTruncated: true,
    });
  });
});

describe('sanitizeFilenameSegment (SAA-797 F4)', () => {
  it('collapses path traversal out of a hostile node id', () => {
    expect(sanitizeFilenameSegment('../../etc/passwd')).toBe('__.._etc_passwd');
  });

  it('neutralizes a bare leading-dot traversal segment', () => {
    expect(sanitizeFilenameSegment('..')).toBe('_');
  });

  it('keeps a benign segment intact', () => {
    expect(sanitizeFilenameSegment('node-1')).toBe('node-1');
  });

  it.each(['../../etc/passwd', 'a/b\\c', '..\\..\\win', '....'])(
    'never yields a path separator or leading dot for %p',
    (hostile) => {
      const segment = sanitizeFilenameSegment(hostile);

      expect(segment).not.toMatch(/[\\/]/);
      expect(segment.startsWith('.')).toBe(false);
    },
  );
});

/** Mounts the viewer with the given cap and optional run client double. */
function mount(
  limit: GraphIoPanelLimit,
  runClient?: { getRunResult: jest.Mock },
): ComponentFixture<GraphIoViewerComponent> {
  const providers: unknown[] = [
    { provide: GRAPH_IO_PANEL_LIMIT, useValue: limit },
  ];
  if (runClient) providers.push({ provide: GraphRunClient, useValue: runClient });

  TestBed.configureTestingModule({ providers });
  return TestBed.createComponent(GraphIoViewerComponent);
}

describe('GraphIoViewerComponent — cap and download (SAA-722)', () => {
  let createObjectUrl: jest.Mock;
  let capturedBlob: Blob | null;
  let downloadedFilenames: string[];
  let clickSpy: jest.SpyInstance;

  beforeEach(() => {
    capturedBlob = null;
    downloadedFilenames = [];
    createObjectUrl = jest.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:test';
    });
    (URL as unknown as { createObjectURL: jest.Mock }).createObjectURL = createObjectUrl;
    (URL as unknown as { revokeObjectURL: jest.Mock }).revokeObjectURL = jest.fn();
    clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedFilenames.push(this.download);
      });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    clickSpy.mockRestore();
  });

  it('exposes the configured cap as a human-readable label', () => {
    const fixture = mount({ bytes: 4096, lines: 2 });
    const component = fixture.componentInstance;

    expect(component.limitLabel()).toBe('4 KB / 2 lines');
  });

  it('is not truncated when the value is under both caps', () => {
    const fixture = mount({ bytes: 4096, lines: 2000 });
    fixture.componentRef.setInput('value', { a: 1 });
    fixture.detectChanges();

    expect(fixture.componentInstance.isTruncated()).toBe(false);
    expect(
      fixture.nativeElement.querySelector('.graph-io__truncated'),
    ).toBeNull();
  });

  it('caps the raw text and renders the truncation notice when the byte cap binds', () => {
    const fixture = mount({ bytes: 16, lines: 2000 });
    fixture.componentRef.setInput('value', 'x'.repeat(50));
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.isTruncated()).toBe(true);
    expect(component.rawText()).toHaveLength(16);

    const notice = fixture.nativeElement.querySelector(
      '.graph-io__truncated',
    ) as HTMLElement;
    expect(notice).not.toBeNull();
    expect(notice.textContent).toContain('0 KB / 2000 lines');
    expect(
      fixture.nativeElement.querySelector('.graph-io__truncated-download'),
    ).not.toBeNull();
  });

  it('caps the visible table rows and flags truncation when the line cap binds', () => {
    const fixture = mount({ bytes: 4096, lines: 2 });
    fixture.componentRef.setInput('value', ['a', 'b', 'c', 'd']);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.visibleTableRows()).toHaveLength(2);
    expect(component.isTruncated()).toBe(true);
    expect(
      fixture.nativeElement.querySelector('.graph-io__truncated'),
    ).not.toBeNull();
  });

  it('caps a single oversized table cell and marks it truncated (SAA-797 F1, SAA-1432 R2)', () => {
    const fixture = mount({ bytes: 16, lines: 2000 });
    fixture.componentRef.setInput('value', { blob: 'x'.repeat(4096) });
    fixture.componentInstance.setMode('table');
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const row = component.tableRows()[0];
    expect(row.key).toBe('blob');
    expect(row.truncated).toBe(true);
    expect(row.text).toHaveLength(16);

    // R2: the row is trimmed to the shared budget — 'blob' (4 bytes) + 12 x's.
    const visible = component.visibleTableRows()[0];
    expect(visible.text).toHaveLength(12);
    expect(visible.bytes).toBe(16);
    expect(visible.truncated).toBe(true);

    expect(component.tableCellTruncated()).toBe(true);
    expect(component.isTruncated()).toBe(true);

    const marker = fixture.nativeElement.querySelector(
      '.graph-io__table-cell-truncated',
    );
    expect(marker).not.toBeNull();

    const cell = fixture.nativeElement.querySelector(
      '.graph-io__table td:last-child',
    ) as HTMLElement;
    expect(cell.textContent?.match(/x/g) ?? []).toHaveLength(12);
  });

  it('never renders a multi-MB cell in full — bounding a single cell (SAA-797 F1)', () => {
    const fixture = mount({ bytes: 1024, lines: 2000 });
    fixture.componentRef.setInput('value', { huge: 'x'.repeat(2_000_000) });
    fixture.componentInstance.setMode('table');
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const row = component.tableRows()[0];
    expect(row.text).toHaveLength(1024);
    expect(row.truncated).toBe(true);
    expect(component.tableCellTruncated()).toBe(true);
    expect(component.isTruncated()).toBe(true);
    expect(
      fixture.nativeElement.querySelector('.graph-io__table-cell-truncated'),
    ).not.toBeNull();
  });

  it('does not flag a table cell that fits the cap (SAA-797 F1)', () => {
    const fixture = mount({ bytes: 4096, lines: 2000 });
    fixture.componentRef.setInput('value', { ok: 'small' });
    fixture.componentInstance.setMode('table');
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.tableRows()[0].truncated).toBe(false);
    expect(component.tableCellTruncated()).toBe(false);
    expect(component.isTruncated()).toBe(false);
    expect(
      fixture.nativeElement.querySelector('.graph-io__table-cell-truncated'),
    ).toBeNull();
  });

  describe('table key cap and render identity (SAA-1432 R1)', () => {
    it('caps a multi-MB key to the configured byte limit and flags it', () => {
      const limit = { bytes: 64, lines: 2000 };
      const hugeKey = 'k'.repeat(2_000_000);
      const fixture = mount(limit);
      fixture.componentRef.setInput('value', { [hugeKey]: 'v' });
      fixture.componentInstance.setMode('table');
      fixture.detectChanges();

      const component = fixture.componentInstance;
      const row = component.tableRows()[0];
      expect(row.key).toHaveLength(limit.bytes);
      expect(row.keyTruncated).toBe(true);
      expect(row.truncated).toBe(true);

      const keyCell = fixture.nativeElement.querySelector(
        '.graph-io__table-key',
      ) as HTMLElement;
      expect(keyCell.textContent?.match(/k/g) ?? []).toHaveLength(limit.bytes);
      expect(
        fixture.nativeElement.querySelector('.graph-io__table-key-truncated'),
      ).not.toBeNull();
    });

    it('renders two distinct oversized keys with the same capped prefix without a duplicate-track failure', () => {
      const limit = { bytes: 4096, lines: 2 };
      const fixture = mount(limit);
      fixture.componentRef.setInput('value', {
        ['shared\nline2\n' + 'x'.repeat(4096)]: '',
        ['shared\nline2\n' + 'y'.repeat(4096)]: '',
      });
      fixture.componentInstance.setMode('table');

      expect(() => fixture.detectChanges()).not.toThrow();

      const component = fixture.componentInstance;
      const rows = component.tableRows();
      expect(rows).toHaveLength(2);
      expect(rows[0].key).toBe('shared\nline2');
      expect(rows[1].key).toBe('shared\nline2');
      expect(new Set(rows.map((row) => row.id)).size).toBe(2);

      const renderedRows = fixture.nativeElement.querySelectorAll(
        '.graph-io__table tbody tr',
      );
      expect(renderedRows).toHaveLength(2);
    });
  });

  describe('table aggregate byte budget (SAA-1432 R2)', () => {
    /** Sums the rendered key+text UTF-8 bytes across the visible rows. */
    function renderedBytes(
      rows: ReturnType<GraphIoViewerComponent['visibleTableRows']>,
    ): number {
      return rows.reduce(
        (total, row) =>
          total +
          new TextEncoder().encode(row.key).length +
          new TextEncoder().encode(row.text).length,
        0,
      );
    }

    it('keeps the rendered key+text bytes of every visible row within the aggregate budget', () => {
      const limit = { bytes: 20, lines: 2000 };
      const fixture = mount(limit);
      fixture.componentRef.setInput('value', {
        aa: '123456',
        bb: '123456',
        cc: '123456',
        dd: '123456',
      });
      fixture.componentInstance.setMode('table');
      fixture.detectChanges();

      const visible = fixture.componentInstance.visibleTableRows();
      expect(visible).toHaveLength(3);
      expect(renderedBytes(visible)).toBeLessThanOrEqual(limit.bytes);
      expect(
        visible.reduce((total, row) => total + row.bytes, 0),
      ).toBeLessThanOrEqual(limit.bytes);
    });

    it('trims the overflowing row and drops the rows past the budget, flagging truncation', () => {
      const limit = { bytes: 20, lines: 2000 };
      const fixture = mount(limit);
      fixture.componentRef.setInput('value', {
        aa: '123456',
        bb: '123456',
        cc: '123456',
        dd: '123456',
      });
      fixture.componentInstance.setMode('table');
      fixture.detectChanges();

      const component = fixture.componentInstance;
      const visible = component.visibleTableRows();
      const trimmed = visible[visible.length - 1];
      expect(trimmed.key).toBe('cc');
      expect(trimmed.text.length).toBeGreaterThan(0);
      expect(trimmed.text.length).toBeLessThan('123456'.length);
      expect(trimmed.truncated).toBe(true);
      expect(trimmed.textTruncated).toBe(true);

      expect(component.tableCellTruncated()).toBe(true);
      expect(component.isTruncated()).toBe(true);
      expect(component.tableTruncated()).toBe(true);
      expect(visible).toHaveLength(3);
    });

    it('trims the very first oversized row to the budget instead of dropping it', () => {
      const fixture = mount({ bytes: 16, lines: 2000 });
      fixture.componentRef.setInput('value', { blob: 'x'.repeat(4096) });
      fixture.componentInstance.setMode('table');
      fixture.detectChanges();

      const component = fixture.componentInstance;
      const visible = component.visibleTableRows();
      expect(visible).toHaveLength(1);
      expect(visible[0].bytes).toBeLessThanOrEqual(16);
      expect(visible[0].truncated).toBe(true);
      expect(component.tableTruncated()).toBe(false);
      expect(component.isTruncated()).toBe(true);
    });

    it('cuts a multi-byte cell cleanly at a code-point boundary without decode slack', () => {
      const limit = { bytes: 10, lines: 2000 };
      const fixture = mount(limit);
      fixture.componentRef.setInput('value', { 'ééé': 'ééé' });
      fixture.componentInstance.setMode('table');
      fixture.detectChanges();

      const component = fixture.componentInstance;
      const visible = component.visibleTableRows();
      expect(visible).toHaveLength(1);
      expect(visible[0].key).toBe('ééé');
      expect(visible[0].text).toBe('éé');
      expect(visible[0].textTruncated).toBe(true);
      expect(renderedBytes(visible)).toBe(limit.bytes);
      expect(component.tableCellTruncated()).toBe(true);
    });

    it('adds only U+FFFD decode-replacement slack when the cut lands mid-character', () => {
      const limit = { bytes: 7, lines: 2000 };
      const fixture = mount(limit);
      fixture.componentRef.setInput('value', { 'é': 'ééé' });
      fixture.componentInstance.setMode('table');
      fixture.detectChanges();

      const component = fixture.componentInstance;
      const visible = component.visibleTableRows();
      expect(visible).toHaveLength(1);

      const row = visible[0];
      expect(row.key).toBe('é');
      expect(row.text).toBe('éé\uFFFD');
      expect(row.textTruncated).toBe(true);
      expect(row.truncated).toBe(true);

      const bytes = renderedBytes(visible);
      expect(bytes).toBeGreaterThan(limit.bytes);
      expect(bytes).toBeLessThanOrEqual(limit.bytes + 2);
      expect(bytes).toBe(9);
      expect(component.tableCellTruncated()).toBe(true);
      expect(component.tableTruncated()).toBe(false);
    });
  });

  it('requires BOTH runId and nodeId to enable the download action', () => {
    const fixture = mount({ bytes: 4096, lines: 2000 });
    const component = fixture.componentInstance;

    expect(component.canDownload()).toBe(false);

    fixture.componentRef.setInput('runId', 'run-1');
    expect(component.canDownload()).toBe(false);

    fixture.componentRef.setInput('nodeId', 'node-1');
    expect(component.canDownload()).toBe(true);

    fixture.componentRef.setInput('runId', '');
    expect(component.canDownload()).toBe(false);
  });

  it('downloads the full payload fetched from the run client untouched, with no truncation marker (SAA-797 F3)', async () => {
    const serverPayload = { result: 42 };
    const runClient = {
      getRunResult: jest.fn().mockResolvedValue({
        nodeResults: { 'node-1': { outputs: serverPayload } },
      }),
    };
    const fixture = mount({ bytes: 4096, lines: 2000 }, runClient);
    fixture.componentRef.setInput('value', { rendered: true });
    fixture.componentRef.setInput('runId', 'run-1');
    fixture.componentRef.setInput('nodeId', 'node-1');
    fixture.componentRef.setInput('field', 'outputs' as GraphIoViewerField);

    await fixture.componentInstance.download();

    expect(runClient.getRunResult).toHaveBeenCalledWith('run-1');
    expect(fixture.componentInstance.downloadFallback()).toBe(false);
    expect(fixture.componentInstance.downloadError()).toBeNull();
    expect(capturedBlob).not.toBeNull();
    const saved = JSON.parse(await blobText(capturedBlob as Blob));
    expect(saved).toEqual(serverPayload);
    expect(saved[GRAPH_IO_TRUNCATED_MARKER]).toBeUndefined();
  });

  it('falls back and marks the download when the run client fetch fails with a network-class error (SAA-797 F3)', async () => {
    const runClient = {
      getRunResult: jest.fn().mockRejectedValue(new TypeError('fetch failed')),
    };
    const fixture = mount({ bytes: 4096, lines: 2000 }, runClient);
    fixture.componentRef.setInput('value', { rendered: 'fallback' });
    fixture.componentRef.setInput('runId', 'run-1');
    fixture.componentRef.setInput('nodeId', 'node-1');

    await fixture.componentInstance.download();

    expect(fixture.componentInstance.downloadFallback()).toBe(true);
    expect(fixture.componentInstance.downloadError()).toBeNull();
    const saved = JSON.parse(await blobText(capturedBlob as Blob));
    expect(saved).toEqual({
      rendered: 'fallback',
      [GRAPH_IO_TRUNCATED_MARKER]: true,
    });
  });

  it('falls back and marks the download when the run client is unavailable (SAA-797 F3)', async () => {
    const fixture = mount({ bytes: 4096, lines: 2000 });
    fixture.componentRef.setInput('value', { rendered: 'no-client' });
    fixture.componentRef.setInput('runId', 'run-1');
    fixture.componentRef.setInput('nodeId', 'node-1');

    await fixture.componentInstance.download();

    expect(fixture.componentInstance.downloadFallback()).toBe(true);
    const saved = JSON.parse(await blobText(capturedBlob as Blob));
    expect(saved).toEqual({
      rendered: 'no-client',
      [GRAPH_IO_TRUNCATED_MARKER]: true,
    });
  });

  it('falls back and marks the download when the server has no payload for the node (SAA-797 F3)', async () => {
    const runClient = {
      getRunResult: jest.fn().mockResolvedValue({ nodeResults: {} }),
    };
    const fixture = mount({ bytes: 4096, lines: 2000 }, runClient);
    fixture.componentRef.setInput('value', { rendered: 'missing-node' });
    fixture.componentRef.setInput('runId', 'run-1');
    fixture.componentRef.setInput('nodeId', 'node-1');

    await fixture.componentInstance.download();

    expect(fixture.componentInstance.downloadFallback()).toBe(true);
    const saved = JSON.parse(await blobText(capturedBlob as Blob));
    expect(saved).toEqual({
      rendered: 'missing-node',
      [GRAPH_IO_TRUNCATED_MARKER]: true,
    });
  });

  it('wraps a non-record value in a marker envelope when it falls back (SAA-797 F3)', async () => {
    const fixture = mount({ bytes: 4096, lines: 2000 });
    fixture.componentRef.setInput('value', 'plain string payload');
    fixture.componentRef.setInput('runId', 'run-1');
    fixture.componentRef.setInput('nodeId', 'node-1');

    await fixture.componentInstance.download();

    expect(fixture.componentInstance.downloadFallback()).toBe(true);
    const saved = JSON.parse(await blobText(capturedBlob as Blob));
    expect(saved).toEqual({
      [GRAPH_IO_TRUNCATED_MARKER]: true,
      value: 'plain string payload',
    });
  });

  it('surfaces a non-network fetch error and downloads nothing (SAA-797 F3)', async () => {
    const runClient = {
      getRunResult: jest.fn().mockRejectedValue(new Error('bad request')),
    };
    const fixture = mount({ bytes: 4096, lines: 2000 }, runClient);
    fixture.componentRef.setInput('value', { rendered: 'x' });
    fixture.componentRef.setInput('runId', 'run-1');
    fixture.componentRef.setInput('nodeId', 'node-1');
    fixture.detectChanges();

    await fixture.componentInstance.download();
    fixture.detectChanges();

    expect(fixture.componentInstance.downloadError()).toBe('bad request');
    expect(fixture.componentInstance.downloadFallback()).toBe(false);
    expect(createObjectUrl).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();

    const alert = fixture.nativeElement.querySelector(
      '.graph-io__download-error[role="alert"]',
    ) as HTMLElement;
    expect(alert).not.toBeNull();
    expect(alert.textContent).toContain('bad request');
    expect(
      fixture.nativeElement.querySelector('.graph-io__download-fallback'),
    ).toBeNull();
  });

  describe('download error classification (SAA-1432 R4)', () => {
    it('surfaces a client-bug TypeError and downloads nothing', async () => {
      const message = "Cannot read properties of undefined (reading 'x')";
      const runClient = {
        getRunResult: jest.fn().mockRejectedValue(new TypeError(message)),
      };
      const fixture = mount({ bytes: 4096, lines: 2000 }, runClient);
      fixture.componentRef.setInput('value', { rendered: 'x' });
      fixture.componentRef.setInput('runId', 'run-1');
      fixture.componentRef.setInput('nodeId', 'node-1');
      fixture.detectChanges();

      await fixture.componentInstance.download();
      fixture.detectChanges();

      expect(fixture.componentInstance.downloadError()).toBe(message);
      expect(fixture.componentInstance.downloadFallback()).toBe(false);
      expect(createObjectUrl).not.toHaveBeenCalled();
      expect(clickSpy).not.toHaveBeenCalled();

      const alert = fixture.nativeElement.querySelector(
        '.graph-io__download-error[role="alert"]',
      ) as HTMLElement;
      expect(alert).not.toBeNull();
      expect(alert.textContent).toContain(message);
      expect(
        fixture.nativeElement.querySelector('.graph-io__download-fallback'),
      ).toBeNull();
    });

    it('still falls back and marks a transport-shaped TypeError', async () => {
      const runClient = {
        getRunResult: jest.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      };
      const fixture = mount({ bytes: 4096, lines: 2000 }, runClient);
      fixture.componentRef.setInput('value', { rendered: 'fallback' });
      fixture.componentRef.setInput('runId', 'run-1');
      fixture.componentRef.setInput('nodeId', 'node-1');
      fixture.detectChanges();

      await fixture.componentInstance.download();
      fixture.detectChanges();

      expect(fixture.componentInstance.downloadError()).toBeNull();
      expect(fixture.componentInstance.downloadFallback()).toBe(true);
      expect(createObjectUrl).toHaveBeenCalledTimes(1);
      const saved = JSON.parse(await blobText(capturedBlob as Blob));
      expect(saved).toEqual({
        rendered: 'fallback',
        __graphIoTruncated: true,
      });

      const notice = fixture.nativeElement.querySelector(
        '.graph-io__download-fallback[role="status"]',
      ) as HTMLElement;
      expect(notice).not.toBeNull();
      expect(notice.textContent).toContain('__graphIoTruncated');
    });
  });

  it('preserves a real _truncated payload key when the fallback download is marked (SAA-1432 R3)', async () => {
    const fixture = mount({ bytes: 4096, lines: 2000 });
    fixture.componentRef.setInput('value', { _truncated: 'real', a: 1 });
    fixture.componentRef.setInput('runId', 'run-1');
    fixture.componentRef.setInput('nodeId', 'node-1');

    await fixture.componentInstance.download();

    expect(fixture.componentInstance.downloadFallback()).toBe(true);
    const saved = JSON.parse(await blobText(capturedBlob as Blob));
    expect(saved._truncated).toBe('real');
    expect(saved.__graphIoTruncated).toBe(true);
  });

  it('renders the fallback status notice inside the has-contents branch (SAA-797 F3, SAA-1432 R3)', async () => {
    const fixture = mount({ bytes: 4096, lines: 2000 });
    fixture.componentRef.setInput('value', { rendered: 'x' });
    fixture.componentRef.setInput('runId', 'run-1');
    fixture.componentRef.setInput('nodeId', 'node-1');
    fixture.detectChanges();

    await fixture.componentInstance.download();
    fixture.detectChanges();

    const notice = fixture.nativeElement.querySelector(
      '.graph-io__download-fallback[role="status"]',
    ) as HTMLElement;
    expect(notice).not.toBeNull();
    expect(notice.textContent).toContain(GRAPH_IO_TRUNCATED_MARKER);
    expect(notice.textContent).toContain('__graphIoTruncated');
  });

  it('resets downloadError and downloadFallback on the next attempt (SAA-797 F3)', async () => {
    const getRunResult = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient boom'))
      .mockResolvedValueOnce({ nodeResults: { 'node-1': { outputs: { ok: true } } } });
    const fixture = mount({ bytes: 4096, lines: 2000 }, { getRunResult });
    fixture.componentRef.setInput('value', { rendered: 'x' });
    fixture.componentRef.setInput('runId', 'run-1');
    fixture.componentRef.setInput('nodeId', 'node-1');
    fixture.componentRef.setInput('field', 'outputs' as GraphIoViewerField);

    await fixture.componentInstance.download();
    expect(fixture.componentInstance.downloadError()).toBe('transient boom');

    await fixture.componentInstance.download();
    expect(fixture.componentInstance.downloadError()).toBeNull();
    expect(fixture.componentInstance.downloadFallback()).toBe(false);
    const saved = JSON.parse(await blobText(capturedBlob as Blob));
    expect(saved).toEqual({ ok: true });
  });

  it('does not download when runId or nodeId is missing', async () => {
    const runClient = { getRunResult: jest.fn() };
    const fixture = mount({ bytes: 4096, lines: 2000 }, runClient);
    fixture.componentRef.setInput('runId', 'run-1');

    await fixture.componentInstance.download();

    expect(runClient.getRunResult).not.toHaveBeenCalled();
    expect(createObjectUrl).not.toHaveBeenCalled();
  });

  describe('download filename sanitization (SAA-797 F4)', () => {
    it('sanitizes a hostile node id to an allowed-character filename', async () => {
      const fixture = mount({ bytes: 4096, lines: 2000 });
      fixture.componentRef.setInput('value', { ok: true });
      fixture.componentRef.setInput('runId', 'run-1');
      fixture.componentRef.setInput('nodeId', '../../etc/passwd');
      fixture.componentRef.setInput('field', 'outputs' as GraphIoViewerField);

      await fixture.componentInstance.download();

      expect(downloadedFilenames).toHaveLength(1);
      const name = downloadedFilenames[0];
      expect(name).toBe('outputs-__.._etc_passwd.json');
      expect(name).toMatch(/^[A-Za-z0-9._-]+$/);
      expect(name).not.toMatch(/[\\/]/);
      expect(name.startsWith('.')).toBe(false);
    });

    it('keeps a benign field/node filename intact', async () => {
      const fixture = mount({ bytes: 4096, lines: 2000 });
      fixture.componentRef.setInput('value', { ok: true });
      fixture.componentRef.setInput('runId', 'run-1');
      fixture.componentRef.setInput('nodeId', 'node-1');
      fixture.componentRef.setInput('field', 'inputs' as GraphIoViewerField);

      await fixture.componentInstance.download();

      expect(downloadedFilenames[0]).toBe('inputs-node-1.json');
    });

    it('sanitizes a hostile field value as well as the node id', async () => {
      const fixture = mount({ bytes: 4096, lines: 2000 });
      fixture.componentRef.setInput('value', { ok: true });
      fixture.componentRef.setInput('runId', 'run-1');
      fixture.componentRef.setInput('nodeId', '..');
      fixture.componentRef.setInput('field', 'a/b' as GraphIoViewerField);

      await fixture.componentInstance.download();

      expect(downloadedFilenames[0]).toBe('a_b-_.json');
      expect(downloadedFilenames[0]).toMatch(/^[A-Za-z0-9._-]+$/);
    });
  });
});
