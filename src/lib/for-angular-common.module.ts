/**
 * @module lib/for-angular-common.module
 * @description Core Angular module and providers for Decaf's for-angular package.
 * @summary Provides the shared Angular module, injection tokens and helper functions used
 * by the for-angular integration. This module wires up common imports (forms, translation)
 * and exposes helper providers such as DB adapter registration and logger utilities.
 * @link {@link ForAngularCommonModule}
 */
import {
  NgModule,
  ModuleWithProviders,
  InjectionToken,
  Provider,
  EnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { Logger, Logging } from '@decaf-ts/logging';
import { I18nToken } from './engine/interfaces';
import { getOnWindow, getWindowDocument, setOnWindow } from './utils/helpers';
import {
  DecafRepository,
  FunctionLike,
  DecafRepositoryAdapter,
  KeyValue
} from './engine/types';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { Repository } from '@decaf-ts/core';
import { Constructor, Metadata, uses } from '@decaf-ts/decoration';
import { AnimationController, provideIonicAngular } from '@ionic/angular/standalone';
import { NgxComponentDirective } from './engine';




const CommonModules = [
  CommonModule,
  FormsModule,
  ReactiveFormsModule,
  TranslateModule,
  TranslatePipe,
];

/**
 * @description Main Angular module for the Decaf framework.
 * @summary The ForAngularCommonModule provides the core functionality for integrating Decaf with Angular applications.
 * It imports and exports common Angular and Ionic components and modules needed for Decaf applications,
 * including form handling, translation support, and Ionic UI components. This module can be imported
 * directly or via the forRoot() method for proper initialization in the application's root module.
 * @class ForAngularCommonModule
 * @memberOf module:lib/for-angular-common.module
 * @example
 * // In your app module:
 * @NgModule({
 *   imports: [
 *     ForAngularCommonModule.forRoot(),
 *     // other imports
 *   ],
 *   // ...
 * })
 * export class AppModule {}
 */
@NgModule({
  imports: CommonModules,
  declarations: [],
  exports: CommonModules,
  schemas: [],
  providers: [],
})
export class ForAngularCommonModule {
  /**
   * @description Creates a module with providers for root module import.
   * @summary This static method provides the proper way to import the ForAngularCommonModule in the application's
   * root module. It returns a ModuleWithProviders object that includes the ForAngularCommonModule itself.
   * Using forRoot() ensures that the module and its providers are properly initialized and only
   * instantiated once in the application.
   * @return {ModuleWithProviders<ForAngularCommonModule>} The module with its providers
   * @memberOf ForAngularCommonModule
   * @static
   * @example
   * // Import in root module
   * @NgModule({
   *   imports: [ForAngularCommonModule.forRoot()],
   *   // ...
   * })
   * export class AppModule {}
   */
  static forRoot(): ModuleWithProviders<ForAngularCommonModule> {
    return {
      ngModule: ForAngularCommonModule,
    };
  }
}
