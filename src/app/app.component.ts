import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
// import { TranslatePipe } from '@ngx-translate/core';
import { ComponentsModule } from '../lib/components/components.module';
import { MenuItem, NgxRenderingEngine2 } from '../lib/engine';
import { IonApp, IonRouterOutlet, IonSplitPane, IonImg, IonContent, IonMenu } from '@ionic/angular/standalone';
import { Menu } from './utils/contants';
import { RouterLink } from '@angular/router';

try {
  const engine = new NgxRenderingEngine2();
  // engine
  //   .initialize(FieldComponent)
  //   .then(() => {
  //     console.debug('Rendering engine initialized');
  //   })
  //   .catch((error) => {
  //     console.error('Error initializing rendering engine:', error);
  //   });
  Model.setBuilder(Model.fromModel as ModelBuilderFunction);
} catch (e: unknown) {
  throw new Error(`Failed to load rendering engine: ${e}`);
}


// ComponentsModule, RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonLabel, IonRouterLink, IonRouterOutlet

@Component({
  standalone: true,
  selector: 'app-root',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [ComponentsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Decaf-ts for-angular demo';
  menu: MenuItem[] = Menu;

}
