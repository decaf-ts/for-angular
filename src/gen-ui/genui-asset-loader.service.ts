import { Injectable, inject } from "@angular/core";
import { GENUI_CONFIG } from "./genui.config";

/**
 * @description Lazily loaded rendering engines
 * @typedef {string} GenuiEngine
 * @memberOf module:gen-ui
 */
export type GenuiEngine = "mermaid" | "echarts" | "three" | "maplibre";

interface EngineDescriptor {
  file: string;
  global: string;
}

const ENGINES: Record<GenuiEngine, EngineDescriptor> = {
  mermaid: { file: "mermaid.js", global: "mermaid" },
  echarts: { file: "echarts.js", global: "echarts" },
  three: { file: "three.js", global: "THREE" },
  maplibre: { file: "maplibre.js", global: "maplibregl" },
};

const LOADED = new Map<GenuiEngine, Promise<unknown>>();

/**
 * @description Loads heavy rendering engines on demand from the harness plugin
 * @summary Keeps Mermaid, ECharts, Three.js, and MapLibre out of this package.
 * Each engine is fetched once from {@link GenuiConfig.assetBaseUrl} as a script,
 * the promise is cached, and the registered global is returned. Concurrent
 * callers share the same load.
 * @class GenuiAssetLoaderService
 * @example
 * ```typescript
 * const loader = inject(GenuiAssetLoaderService);
 * const echarts = await loader.load("echarts");
 * ```
 */
@Injectable({ providedIn: "root" })
export class GenuiAssetLoaderService {
  private readonly config = inject(GENUI_CONFIG);

  // Heavy engines stay out of this package: they are fetched from the harness
  // plugin's `GET /genui/assets/:file` route on first need and cached.
  /**
   * @description Load an engine and resolve with its global object
   * @summary Injects the engine script once, then resolves the global it
   * registers. Rejects when no browser document exists, the script fails to
   * load, or the expected global never appears.
   * @param {GenuiEngine} engine The engine to load.
   * @returns {Promise<unknown>} The engine's global API object.
   */
  load(engine: GenuiEngine): Promise<unknown> {
    const existing = LOADED.get(engine);
    if (existing !== undefined) return existing;
    const promise = this.injectScript(ENGINES[engine]).then(() => {
      const global = (globalThis as Record<string, unknown>)[ENGINES[engine].global];
      if (global === undefined) throw new Error(`GenUI engine '${engine}' did not register a global`);
      return global;
    });
    LOADED.set(engine, promise);
    return promise;
  }

  private injectScript(descriptor: EngineDescriptor): Promise<void> {
    if (typeof document === "undefined") {
      return Promise.reject(new Error("GenUI engines require a browser document"));
    }
    const id = `genui-engine-${descriptor.file}`;
    const found = document.getElementById(id);
    if (found !== null) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      const revision = this.config.assetRevision;
      script.id = id;
      script.async = true;
      script.src = `${this.config.assetBaseUrl}/${descriptor.file}${
        revision === undefined ? "" : `?rev=${encodeURIComponent(revision)}`
      }`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load GenUI asset '${descriptor.file}'`));
      document.head.appendChild(script);
    });
  }
}
