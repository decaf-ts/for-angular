/**
 * @module for-angular/graph/validation
 * @summary Editor validity projection (DECAF-50 D5/§4.22).
 * @description Exposes the canonical workflow validation client
 * (`POST /graph/workflows/validate`) and the singleton validity store the
 * toolbar, canvas, right pane, and page pre-run gate project from. The client
 * consumes the backend authority; no validator or engine code reaches the browser
 * bundle (DECAF-35 boundary).
 */
export * from './GraphWorkflowValidateClient';
export * from './GraphWorkflowValidityStore';
