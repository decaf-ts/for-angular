/**
 * @module app/user-requests
 * @summary App-side bindings for the User Request Resolution Engine: the
 * Angular rendering-engine facade that presents the generic library modal
 * against the real `SteppedFormComponent`, plus the demo app's `user-data`
 * handler. Both are consumed by the `/user-request` demo page.
 */

export * from './user-request-rendering-context';
export * from './handlers/user-data-handler';
