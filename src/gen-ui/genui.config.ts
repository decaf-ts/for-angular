import { InjectionToken, Provider, makeEnvironmentProviders } from "@angular/core";

/**
 * @description Runtime configuration for the GenUI renderer
 * @summary Supplied through {@link GENUI_CONFIG} or {@link provideGenui}.
 * Defaults target the same-origin harness GenUI plugin routes, so an embedded
 * chat surface needs no configuration.
 * @typedef {Object} GenuiConfig
 * @property {string} actionUrl Harness action endpoint. Defaults to `/genui/actions`.
 * @property {string} assetBaseUrl Flat engine-bundle route served by the harness
 * GenUI plugin. Defaults to `/genui/assets`.
 * @property {boolean} autoRelay Disable the network relay for read-only surfaces;
 * the component `action` output still fires.
 * @property {string} [assetRevision] Optional revision query appended to asset requests.
 * @memberOf module:gen-ui
 */
export interface GenuiConfig {
  // Harness action endpoint. Defaults to the same-origin plugin route.
  actionUrl: string;
  // Flat engine bundle route served by the harness GenUI plugin.
  assetBaseUrl: string;
  // Disable the network relay for read-only surfaces (the `action` output still fires).
  autoRelay: boolean;
  // Optional revision query appended to asset requests.
  assetRevision?: string;
}

/**
 * @description Default GenUI configuration targeting the harness plugin routes
 * @constant
 * @type {GenuiConfig}
 * @memberOf module:gen-ui
 */
export const DEFAULT_GENUI_CONFIG: GenuiConfig = {
  actionUrl: "/genui/actions",
  assetBaseUrl: "/genui/assets",
  autoRelay: true,
};

/**
 * @description Injection token carrying the active {@link GenuiConfig}
 * @summary Provided in root by default, so a host that does not call
 * {@link provideGenui} still gets the same-origin defaults.
 * @constant
 * @type {InjectionToken<GenuiConfig>}
 * @memberOf module:gen-ui
 */
export const GENUI_CONFIG = new InjectionToken<GenuiConfig>("GENUI_CONFIG", {
  providedIn: "root",
  factory: () => DEFAULT_GENUI_CONFIG,
});

/**
 * @description Build providers that override the default GenUI config
 * @summary Merges the partial config shallowly over
 * {@link DEFAULT_GENUI_CONFIG}. Values provided here apply to the injector
 * subtree where the provider is registered.
 * @param {Partial<GenuiConfig>} [config] Overrides to apply.
 * @returns {Provider[]} Angular providers for {@link GENUI_CONFIG}.
 * @function
 * @memberOf module:gen-ui
 */
export function provideGenui(config: Partial<GenuiConfig> = {}): Provider[] {
  return [
    {
      provide: GENUI_CONFIG,
      useValue: { ...DEFAULT_GENUI_CONFIG, ...config },
    },
  ];
}

/**
 * @description Build an environment provider for standalone Angular bootstrap
 * @summary Wraps {@link provideGenui} in `makeEnvironmentProviders` so it can
 * be passed to `bootstrapApplication`.
 * @param {Partial<GenuiConfig>} [config] Overrides to apply.
 * @returns {EnvironmentProviders} Environment providers for {@link GENUI_CONFIG}.
 * @function
 * @memberOf module:gen-ui
 */
export function provideGenuiEnvironment(config: Partial<GenuiConfig> = {}) {
  return makeEnvironmentProviders(provideGenui(config));
}
