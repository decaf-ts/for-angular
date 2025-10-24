/**
 * @module module:lib/for-angular-common.module
 * @description Core Angular module and providers for Decaf's for-angular package.
 * @summary Provides the shared Angular module, injection tokens and helper functions used
 * by the for-angular integration. This module wires up common imports (forms, translation)
 * and exposes helper providers such as DB adapter registration and logger utilities.
 *
 * @link {@link ForAngularCommonModule}
 */
import { NgModule, ModuleWithProviders, InjectionToken, Provider } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { Logger, Logging } from '@decaf-ts/logging';
import { FunctionLike, I18nResourceConfig } from './engine';
import { getOnWindow, getWindow } from './helpers/utils';
import { DecafRepository, DecafRepositoryAdapter, KeyValue } from './engine/types';
import { Constructor, Model, Primitives } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import { Repository, uses } from '@decaf-ts/core';

/** */
export const DB_ADAPTER_PROVIDER = 'DB_ADAPTER_PROVIDER';
export const DB_ADAPTER_PROVIDER_TOKEN = new InjectionToken<DecafRepositoryAdapter>(DB_ADAPTER_PROVIDER);
export const LOCALE_ROOT_TOKEN = new InjectionToken<string>('LOCALE_ROOT_TOKEN');

/* Generic token for injecting on class constuctors */
export const CPTKN = new InjectionToken<unknown>('CPTKN', {providedIn: 'root', factory: () => ''});

export const I18N_CONFIG_TOKEN = new InjectionToken<{resources: I18nResourceConfig[]; versionedSuffix: boolean}>('I18N_CONFIG_TOKEN');

export function getModelRepository(model: Model | string): DecafRepository<Model> {
  try {
    const modelName = (typeof model === Primitives.STRING ? model : (model as Model).constructor.name) as string;
    const constructor = Model.get(modelName.charAt(0).toUpperCase() + modelName.slice(1) as string);
    if (!constructor)
      throw new InternalError(
        `Cannot find model for ${modelName}. was it registered with @model?`
      );
    const dbAdapterFlavour = getOnWindow(DB_ADAPTER_PROVIDER) || undefined;
    if(dbAdapterFlavour)
      uses(dbAdapterFlavour as string)(constructor);
    const repo = Repository.forModel(constructor);
    model = new constructor() as Model;
    return repo;
  } catch (error: unknown) {
    throw new InternalError((error as Error)?.message || (error as string));
  }
}


// export function provideRenderEngine(): Provider[] {

// }

export function provideDbAdapter<DbAdapter extends { flavour: string }>(
  adapterClass: Constructor<DbAdapter>,
  options: KeyValue = {},
  flavour?: string
): Provider {
  const adapter = new adapterClass(options);
  if(flavour)
    flavour = adapter.flavour;
  // Log and expose adapter flavour globally
  getLogger(provideDbAdapter).info(`Using ${adapter.constructor.name} ${flavour} as Db Provider`);
  getWindow()[DB_ADAPTER_PROVIDER] = flavour;
  return {
    provide: DB_ADAPTER_PROVIDER_TOKEN,
    useValue: adapter,
  };
}

const ComponentsAndModules = [
  CommonModule,
  FormsModule,
  ReactiveFormsModule,
  TranslateModule,
  TranslatePipe
];


const log = Logging.for("for-angular");
export function getLogger(instance: string | FunctionLike | unknown): Logger {
  return log.for(instance as string | FunctionLike);
}

/**
 * @description Main Angular module for the Decaf framework
 * @summary The ForAngularCommonModule provides the core functionality for integrating Decaf with Angular applications.
 * It imports and exports common Angular and Ionic components and modules needed for Decaf applications,
 * including form handling, translation support, and Ionic UI components. This module can be imported
 * directly or via the forRoot() method for proper initialization in the application's root module.
 *
 * @class ForAngularCommonModule
 * @example
 * ```typescript
 * // In your app module:
 * @NgModule({
 *   imports: [
 *     ForAngularCommonModule.forRoot(),
 *     // other imports
 *   ],
 *   // ...
 * })
 * export class AppModule {}
 * ```
 */
@NgModule({
  imports: ComponentsAndModules,
  declarations: [],
  exports: ComponentsAndModules,
  schemas: [],
  providers: [
    { provide: CPTKN, useValue: ''},
  ],
})
export class ForAngularCommonModule {
  /**
   * @description Creates a module with providers for root module import
   * @summary This static method provides the proper way to import the ForAngularCommonModule in the application's
   * root module. It returns a ModuleWithProviders object that includes the ForAngularCommonModule itself.
   * Using forRoot() ensures that the module and its providers are properly initialized and only
   * instantiated once in the application.
   *
   * @return {ModuleWithProviders<ForAngularCommonModule>} The module with its providers
   */
  static forRoot(): ModuleWithProviders<ForAngularCommonModule> {
    return {
      ngModule: ForAngularCommonModule,

    };
  }
}
