/**
 * @module for-angular/graph/runs
 * @summary The canonical run lifecycle's Angular clients (DECAF-50 §4.14/§4.15).
 * @description Exposes the HTTP run client (lifecycle endpoints), the SSE
 * run event client (stream/replay/polling fallback), and the singleton signal
 * store folding canonical run envelopes into the canvas execution state plus
 * the DECAF-48 run log console/inspection parity.
 */
export * from './GraphRunClient';
export * from './GraphRunEventClient';
export * from './GraphRunStateStore';
