import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { Logger, Logging } from '@decaf-ts/logging';
import { FunctionLike } from './engine';

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
