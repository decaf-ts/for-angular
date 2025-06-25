import { NgModule, CUSTOM_ELEMENTS_SCHEMA, ModuleWithProviders, NO_ERRORS_SCHEMA} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonApp,
  IonRouterOutlet,
  IonSplitPane,
  IonImg,
  IonContent,
  IonText,
  IonButton,
  IonRouterLink,
  IonTitle
} from '@ionic/angular/standalone';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { Logger, Logging } from '@decaf-ts/logging';

const ComponentsAndModules = [
  IonApp,
  IonRouterOutlet,
  IonSplitPane,
  IonImg,
  IonText,
  IonTitle,
  IonButton,
  IonRouterLink,
  IonContent,
  CommonModule,
  FormsModule,
  ReactiveFormsModule,
  TranslateModule,
  TranslatePipe,
];

const log = Logging.for("for-angular");
export function getLogger(instance: object | Function | string): Logger {
  return log.for(instance as any);
}

/**
 * @description Main Angular module for the Decaf framework
 * @summary The ForAngularModule provides the core functionality for integrating Decaf with Angular applications.
 * It imports and exports common Angular and Ionic components and modules needed for Decaf applications,
 * including form handling, translation support, and Ionic UI components. This module can be imported
 * directly or via the forRoot() method for proper initialization in the application's root module.
 *
 * @class ForAngularModule
 * @example
 * ```typescript
 * // In your app module:
 * @NgModule({
 *   imports: [
 *     ForAngularModule.forRoot(),
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
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class ForAngularModule {
  /**
   * @description Creates a module with providers for root module import
   * @summary This static method provides the proper way to import the ForAngularModule in the application's
   * root module. It returns a ModuleWithProviders object that includes the ForAngularModule itself.
   * Using forRoot() ensures that the module and its providers are properly initialized and only
   * instantiated once in the application.
   *
   * @return {ModuleWithProviders<ForAngularModule>} The module with its providers
   */
  static forRoot(): ModuleWithProviders<ForAngularModule> {
    return {
      ngModule: ForAngularModule,
    };
  }
}
