import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MenuItem, NgxRenderingEngine2 } from '../lib/engine';
import { Menu } from './utils/contants';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet, IonRouterLink } from '@ionic/angular/standalone';
import { RouterLink, RouterLinkActive } from '@angular/router';
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


@Component({
  standalone: true,
  selector: 'app-root',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    ForAngularModule,
    IonApp,
    IonSplitPane,
    IonMenu,
    RouterLink,
    RouterLinkActive,
    IonContent,
    IonList,
    IonListHeader,
    IonMenuToggle,
    IonItem,
    IonIcon,
    IonLabel,
    IonRouterLink,
    IonRouterOutlet
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Decaf-ts for-angular demo';
  public menu: MenuItem[] = Menu;

  public appPages = [
    { title: 'Inbox', url: '/folder/inbox', icon: 'mail' },
    { title: 'Outbox', url: '/folder/outbox', icon: 'paper-plane' },
    { title: 'Favorites', url: '/folder/favorites', icon: 'heart' },
    { title: 'Archived', url: '/folder/archived', icon: 'archive' },
    { title: 'Trash', url: '/folder/trash', icon: 'trash' },
    { title: 'Spam', url: '/folder/spam', icon: 'warning' },
  ];

  constructor() {
    addIcons({ chevronForwardOutline });
  }

}
