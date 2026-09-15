import {
  EnvironmentInjector,
  EnvironmentProviders,
  inject,
  Provider,
  provideEnvironmentInitializer,
} from '@angular/core';
import { Adapter } from '@decaf-ts/core';
import { Constructor } from '@decaf-ts/decoration';
import { Logging } from '@decaf-ts/logging';
import { AnimationController, provideIonicAngular } from '@ionic/angular/standalone';
import { getWindow, getWindowDocument, setOnWindow } from '../utils/helpers';
import { NgxRenderingEngine } from './NgxRenderingEngine';
import { AngularEngineKeys, DB_ADAPTER_FLAVOUR_TOKEN, DB_ADAPTER_PROVIDER_TOKEN } from './constants';
import { KeyValue } from './types';

const log = Logging.for('for-angular');

/**
 * @description Environment injector captured at bootstrap by {@link provideDecafDbAdapter}.
 * @summary Lets code outside an Angular injection context (plain functions, callbacks) resolve
 * the registered db adapter via its real DI token instead of a global. `undefined` before
 * bootstrap runs (e.g. Storybook's app config, which calls `provideDecafDbAdapter` outside
 * Angular's lifecycle) — callers should fall back to {@link DB_ADAPTER_FLAVOUR_TOKEN} on `window`
 * in that case.
 */
let dbAdapterInjector: EnvironmentInjector | undefined;

/**
 * @description Returns the environment injector captured by {@link provideDecafDbAdapter}, if any.
 * @return {EnvironmentInjector | undefined} The injector, or `undefined` before bootstrap.
 * @memberOf module:lib/for-angular-common.module
 */
export function getDbAdapterEnvInjector(): EnvironmentInjector | undefined {
  return dbAdapterInjector;
}

/**
 * @description Provides an array of component types for dynamic rendering.
 * @summary Helper function to package component constructors for registration with the
 * rendering engine. This function accepts component classes and returns them as an array
 * suitable for use with the CPTKN injection token.
 * @param {...Constructor[]} components - Component constructor classes to register
 * @return {Constructor} Array of component constructors
 * @memberOf module:lib/for-angular-common.module
 * @example
 * // Register multiple custom components
 * providers: [
 *   { provide: CPTKN, useValue: provideDynamicComponents(MyComponent, AnotherComponent) }
 * ]
 */
export function provideDecafDynamicComponents(...components: unknown[]): Constructor<unknown>[] {
  try {
    const win = getWindow();
    if (!win?.[AngularEngineKeys.LOADED]) new NgxRenderingEngine();
    setOnWindow(AngularEngineKeys.LOADED, true);
  } catch (e: unknown) {
    throw new Error(`Failed to load rendering engine: ${e}`);
  }
  return components as Constructor<unknown>[];
}

/**
 * @description Provides a database adapter for dependency injection.
 * @summary Creates an Angular provider that registers a database adapter instance. This function
 * instantiates the adapter class, registers its flavour globally, and returns a provider object
 * for use in Angular's dependency injection system.
 * @template DbAdapter - The database adapter class type extending {flavour: string}
 * @param {Constructor<DbAdapter>} clazz - Database adapter constructor class
 * @param {KeyValue} [options={}] - Configuration options passed to adapter constructor
 * @param {string} [flavour] - Optional flavour override; uses adapter.flavour if not provided
 * @return {Array<Provider|EnvironmentProviders>} Angular providers for DB_ADAPTER_PROVIDER_TOKEN
 * @memberOf module:lib/for-angular-common.module
 * @example
 * // Register a SQLite adapter
 * providers: [
 *   provideDbAdapter(SqliteAdapter, { database: 'myapp.db' }, 'sqlite')
 * ]
 *
 * // Register with default flavour from adapter
 * providers: [
 *   provideDbAdapter(PostgresAdapter, { host: 'localhost', port: 5432 })
 * ]
 */
export function provideDecafDbAdapter<DbAdapter extends { flavour: string }>(
  clazz: Constructor<DbAdapter>,
  options: KeyValue = {},
  flavour?: string
): (Provider | EnvironmentProviders)[] {
  let adapter: DbAdapter;
  try {
    adapter = new clazz(options);
  } catch (e: unknown) {
    // Storybook (and other multi-bundle webpack setups) can load this module's side effects
    // more than once in the same page, re-running this constructor against the shared
    // `@decaf-ts/core` Adapter registry — reuse the already-registered instance instead of
    // crashing the whole preview.
    if (e instanceof Error && /already registered/.test(e.message) && Adapter.current) {
      adapter = Adapter.current as unknown as DbAdapter;
    } else {
      throw e;
    }
  }
  if (!flavour) {
    flavour = adapter.flavour;
  }
  log.for(provideDecafDbAdapter).info(`Using ${adapter.constructor.name} ${flavour} as Db Provider`);
  // Kept for callers that run before Angular bootstraps (e.g. Storybook's app config) and
  // therefore have no injector yet — see getDbAdapterEnvInjector()/getDbAdapterFlavour().
  setOnWindow(DB_ADAPTER_FLAVOUR_TOKEN, flavour);
  return [
    { provide: DB_ADAPTER_PROVIDER_TOKEN, useValue: adapter },
    provideEnvironmentInitializer(() => {
      dbAdapterInjector = inject(EnvironmentInjector);
    }),
  ];
}

/**
 * Creates a custom page transition animation using the Ionic `AnimationController`.
 *
 * @param baseEl - The base HTML element for the animation.
 * @param opts - Optional parameters for the animation, including:
 *   - `enteringEl`: The HTML element that is entering the view.
 *   - `leavingEl`: The HTML element that is leaving the view.
 *
 * @returns An object containing the `navAnimation`, which is a composed animation
 *          of the entering and leaving animations.
 *
 * The entering animation fades in and slides the element upwards, while the leaving
 * animation fades out and slides the element downwards. Both animations use a cubic-bezier
 * easing function for smooth transitions.
 */
export const decafPageTransition = (baseEl: HTMLElement, opts?: KeyValue) => {
  const animationCtrl = new AnimationController();

  const enteringAnimation = animationCtrl
    .create()
    .addElement(opts?.['enteringEl'])
    .duration(280)
    .easing('cubic-bezier(0.36,0.66,0.04,1)')
    .fromTo('opacity', '0.01', '1')
    .fromTo('transform', 'translateY(40px)', 'translateY(0)');

  const leavingAnimation = animationCtrl
    .create()
    .addElement(opts?.['leavingEl'])
    .duration(200)
    .easing('cubic-bezier(0.36,0.66,0.04,1)')
    .fromTo('opacity', '1', '0')
    .fromTo('transform', 'translateY(0)', 'translateY(20px)');

  return animationCtrl.create().addAnimation([enteringAnimation, leavingAnimation]);
};

export function provideDecafPageTransition(): EnvironmentProviders {
  return provideIonicAngular({
    navAnimation: decafPageTransition,
  });
}

export function provideDecafDarkMode(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => {
    const doc = getWindowDocument();
    doc?.documentElement.classList.add('has-dark-mode');
  });
}
