/**
 * @module for-angular/graph/components/graph-io-viewer/graph-io-viewer.component.spec
 * @summary SAA-722 node I/O viewer cap + download contract, extended with the
 * SAA-797 F1/F3/F4 security-remediation contract.
 * @description Proves the reusable node I/O viewer caps its rendered payload
 * (byte cap first, then line cap) per field and per table cell, exposes the
 * truncation affordances, and downloads the full untruncated payload from the
 * run detail endpoint. SAA-797 adds: a silent-truncated-download guard (only a
 * network-class fetch failure falls back, and the fallback download is marked
 * `_truncated`; any other error downloads nothing and surfaces the error) and
 * filename sanitization of the field/node id download anchor.
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
});

describe('isNetworkClassError (SAA-797 F3)', () => {
  it('is true for the graph backend unavailability error', () => {
    const error = new Error('down');
    error.name = 'GraphBackendUnavailableError';

    expect(isNetworkClassError(error)).toBe(true);
  });

  it.each(['TypeError', 'AbortError', 'TimeoutError'])(
    'is true for a %s error',
    (name) => {
      const error = new Error('x');
      error.name = name;

      expect(isNetworkClassError(error)).toBe(true);
    },
  );

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

  it('caps a single oversized table cell and marks it truncated (SAA-797 F1)', () => {
    const fixture = mount({ bytes: 16, lines: 2000 });
    fixture.componentRef.setInput('value', { blob: 'x'.repeat(4096) });
    fixture.componentInstance.setMode('table');
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const row = component.tableRows()[0];
    expect(row.key).toBe('blob');
    expect(row.truncated).toBe(true);
    expect(row.text).toHaveLength(16);
    expect(component.tableCellTruncated()).toBe(true);
    expect(component.isTruncated()).toBe(true);

    const marker = fixture.nativeElement.querySelector(
      '.graph-io__table-cell-truncated',
    );
    expect(marker).not.toBeNull();

    const cell = fixture.nativeElement.querySelector(
      '.graph-io__table td:last-child',
    ) as HTMLElement;
    expect(cell.textContent?.match(/x/g) ?? []).toHaveLength(16);
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

  it('renders the fallback status notice inside the has-contents branch (SAA-797 F3)', async () => {
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
