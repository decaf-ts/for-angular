import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
// import { TranslatePipe } from '@ngx-translate/core';
import { ComponentsModule } from '../lib/components/components.module';
import { NgxRenderingEngine } from '../lib/engine';
import { IonApp, IonRouterOutlet, IonSplitPane, IonImg } from '@ionic/angular/standalone';

try {
  const engine = new NgxRenderingEngine();
  // engine
  //   .initialize(DecafCrudFieldComponent)
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
  imports: [ComponentsModule, IonApp, IonRouterOutlet, IonSplitPane, IonImg],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Decaf-ts for-angular demo';

}
