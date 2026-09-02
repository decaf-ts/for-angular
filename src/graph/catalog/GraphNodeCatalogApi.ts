/** @module for-angular/graph/catalog/GraphNodeCatalogApi
 * @summary HTTP bridge to the NestJS node catalogue (DECAF-50 §4.13).
 * @description Calls the `graph/node-types...` catalogue endpoints and returns
 * frontend-safe node manifests only, resolving dynamic port and method
 * requests. Endpoint failures surface as {@link GraphCatalogueUnavailableError}
 * (or a `NotFoundError` for unknown kinds); the graphs demo page binds this
 * bridge as the (@link GRAPH_NODE_CATALOG_SOURCE) write-through source.
 */
import { Injectable, inject } from '@angular/core';
import {
  BadRequestError,
  InternalError,
  NotFoundError,
} from '@decaf-ts/db-decorators';
import type {
  GraphJsonValue,
  GraphNodeInstance,
  GraphNodeManifest,
} from '@decaf-ts/ui-decorators/graph';
import type {
  GraphResolvedNodeManifest,
} from '@decaf-ts/integrations/graph/shared';
import { GRAPH_BACKEND_URL } from '../execution/GraphExecutionService';
import type { GraphNodeCatalogSource } from './GraphNodeCatalogStore';

/**
 * Raised when the catalogue is unavailable or responds unexpectedly; mirrors
 * every consumer's error surface so the catalogue's callers fail fast.
 */
export class GraphCatalogueUnavailableError extends InternalError {
  constructor(operation: string, reason?: unknown) {
    super(
      `Graph node catalogue '${operation}' is unavailable (${String(reason ?? 'backend offline')}).`
    );
  }
}

/** HTTP bridge to the NestJS node catalogue (DECAF-50 §4.13): fetches manifests and resolves dynamic ports/methods as data. */
@Injectable({ providedIn: 'root' })
export class GraphNodeCatalogApi implements GraphNodeCatalogSource {
  private readonly backendUrl = inject(GRAPH_BACKEND_URL);
  /** @inheritdoc */
  async fetchManifests(): Promise<GraphNodeManifest[]> {
    const response = await this.request<unknown>('graph/node-types');
    if (Array.isArray(response)) return response as GraphNodeManifest[];
    const record = (response ?? {}) as {
      nodes?: unknown[];
      manifests?: unknown[];
    };
    const manifests = record.nodes ?? record.manifests ?? [];
    return manifests as GraphNodeManifest[];
  }

  /** @inheritdoc */
  async fetchManifest(kind: string): Promise<GraphNodeManifest | undefined> {
    return (await this.request<unknown>(
      `graph/node-types/${encodeURIComponent(kind)}`,
    )) as GraphNodeManifest | undefined;
  }

  /** @inheritdoc */
  async resolveManifest(
    kind: string,
    instance: Pick<GraphNodeInstance, 'parameters' | 'metadata'>
  ): Promise<GraphResolvedNodeManifest> {
    const resolved = await this.request<unknown>(
      `graph/node-types/${encodeURIComponent(kind)}/resolve`,
      'POST',
      {
        parameters: instance.parameters ?? {},
        metadata: instance.metadata ?? {},
      }
    );
    if (!resolved) {
      throw new GraphCatalogueUnavailableError('resolve', `No resolved manifest for kind '${kind}'.`);
    }
    return resolved as GraphResolvedNodeManifest;
  }

  /** @inheritdoc */
  async invokeMethod(
    kind: string,
    method: string,
    request: Record<string, GraphJsonValue>
  ): Promise<GraphJsonValue> {
    return (await this.request<unknown>(
      `graph/node-types/${encodeURIComponent(kind)}/methods/${encodeURIComponent(method)}`,
      'POST',
      request
    )) as GraphJsonValue;
  }

  private async request<T>(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.backendUrl}/${path}`, {
        method,
        // Bodyless GETs must not send `Content-Type`: that header is not
        // CORS-safelisted, so it would trigger a preflight the absent backend
        // can never answer, and a hanging preflight holds the browser network
        // idle state open past the editor's own load budget.
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'include',
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      throw new GraphCatalogueUnavailableError(`${method} ${path}`, error);
    }
    if (!response.ok) {
      const message = await response.text().catch(() => '');
      if (response.status === 404) {
        throw new NotFoundError(`Graph node catalogue has no entry for ${method} /${path}.`);
      }
      const error = response.status < 500
        ? new BadRequestError(`Graph node catalogue ${method} /${path} failed (${response.status}): ${message}`)
        : new InternalError(`Graph node catalogue ${method} /${path} failed (${response.status}).`);
      throw error;
    }
    return (await response.json().catch(() => ({}))) as T;
  }
}
