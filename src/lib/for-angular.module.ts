import { NgModule, CUSTOM_ELEMENTS_SCHEMA, ModuleWithProviders} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonApp, IonRouterOutlet, IonSplitPane, IonImg, IonContent, IonMenu, IonText, IonButton, IonRouterLink } from '@ionic/angular/standalone';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';

const ComponentsAndModules = [
  IonApp,
  IonRouterOutlet,
  IonSplitPane,
  IonImg,
  IonText,
  IonButton,
  IonRouterLink,
  IonRouterOutlet,
  IonContent,
  IonMenu,
  CommonModule,
  FormsModule,
  ReactiveFormsModule,
  TranslateModule,
  TranslatePipe,
];

@NgModule({
  imports: ComponentsAndModules,
  declarations: [],
  exports: ComponentsAndModules,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ForAngularModule {
  static forRoot(): ModuleWithProviders<ForAngularModule> {
    return {
      ngModule: ForAngularModule,
    };
  }
}
