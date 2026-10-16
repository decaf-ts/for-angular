/**
 * @module for-angular/graph/components/graph-io-viewer/graph-io-viewer.component.spec
 * @summary SAA-722 node I/O viewer cap + download contract.
 * @description Proves the reusable node I/O viewer caps its rendered payload
 * (byte cap first, then line cap), exposes the truncation affordances, and
 * downloads the full untruncated payload from the run detail endpoint, falling
 * back to the rendered value when the run client is unavailable or the fetch
 * fails.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  GraphIoViewerComponent,
  graphIoCapText,
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
  let clickSpy: jest.SpyInstance;

  beforeEach(() => {
    capturedBlob = null;
    createObjectUrl = jest.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:test';
    });
    (URL as unknown as { createObjectURL: jest.Mock }).createObjectURL = createObjectUrl;
    (URL as unknown as { revokeObjectURL: jest.Mock }).revokeObjectURL = jest.fn();
    clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
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

  it('downloads the full payload fetched from the run client, not the rendered value', async () => {
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
    expect(capturedBlob).not.toBeNull();
    const saved = JSON.parse(await blobText(capturedBlob as Blob));
    expect(saved).toEqual(serverPayload);
  });

  it('falls back to the rendered value when the run client fetch throws', async () => {
    const runClient = {
      getRunResult: jest.fn().mockRejectedValue(new Error('backend down')),
    };
    const fixture = mount({ bytes: 4096, lines: 2000 }, runClient);
    fixture.componentRef.setInput('value', { rendered: 'fallback' });
    fixture.componentRef.setInput('runId', 'run-1');
    fixture.componentRef.setInput('nodeId', 'node-1');

    await fixture.componentInstance.download();

    const saved = JSON.parse(await blobText(capturedBlob as Blob));
    expect(saved).toEqual({ rendered: 'fallback' });
  });

  it('falls back to the rendered value when the run client is unavailable', async () => {
    const fixture = mount({ bytes: 4096, lines: 2000 });
    fixture.componentRef.setInput('value', { rendered: 'no-client' });
    fixture.componentRef.setInput('runId', 'run-1');
    fixture.componentRef.setInput('nodeId', 'node-1');

    await fixture.componentInstance.download();

    const saved = JSON.parse(await blobText(capturedBlob as Blob));
    expect(saved).toEqual({ rendered: 'no-client' });
  });

  it('falls back to the rendered value when the server has no payload for the node', async () => {
    const runClient = {
      getRunResult: jest.fn().mockResolvedValue({ nodeResults: {} }),
    };
    const fixture = mount({ bytes: 4096, lines: 2000 }, runClient);
    fixture.componentRef.setInput('value', { rendered: 'missing-node' });
    fixture.componentRef.setInput('runId', 'run-1');
    fixture.componentRef.setInput('nodeId', 'node-1');

    await fixture.componentInstance.download();

    const saved = JSON.parse(await blobText(capturedBlob as Blob));
    expect(saved).toEqual({ rendered: 'missing-node' });
  });

  it('does not download when runId or nodeId is missing', async () => {
    const runClient = { getRunResult: jest.fn() };
    const fixture = mount({ bytes: 4096, lines: 2000 }, runClient);
    fixture.componentRef.setInput('runId', 'run-1');

    await fixture.componentInstance.download();

    expect(runClient.getRunResult).not.toHaveBeenCalled();
    expect(createObjectUrl).not.toHaveBeenCalled();
  });
});
