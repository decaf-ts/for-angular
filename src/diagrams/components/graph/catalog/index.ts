/**
 * @module for-angular/graph/catalog
 * @summary Angular node catalogue plumbing (DECAF-50 §4.12/§4.13).
 * @description Exposes the manifest-backed node catalogue: the pluggable
 * frontend sources (HTTP bridge, P4 fixtures and the demo composite fallback),
 * the root-scoped store, the concrete manifest projection and declarative
 * resolution, and the catalog service manifest readers/dispatchers use.
 */
export * from './GraphNodeCatalogApi';
export * from './GraphNodeCatalogReader';
export * from './GraphNodeCatalogService';
export * from './GraphNodeCatalogStore';
export * from './GraphNodeCatalogCompositeSource';
export * from './GraphNodeManifestFixtures';
export * from './GraphNodeResolution';
