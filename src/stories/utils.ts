import { applicationConfig, componentWrapperDecorator, Meta, moduleMetadata } from '@storybook/angular';
import { appConfig } from 'src/app/app.config';
import { RouterService } from 'src/app/services/router.service';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { NgxRenderingEngine } from 'src/lib/engine';
import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { ComponentsModule } from 'src/app/components/components.module';

function getEngine(): void {
  let engine;
  try {
      engine = new NgxRenderingEngine();
      Model.setBuilder(Model.fromModel as ModelBuilderFunction);
    } catch (e: unknown) {
      console.warn(`Engine already loaded`);
    }
}

export function getComponentMeta<C>(imports: unknown[] = [], type: "component" | "page" = "component", args: any = {}): Meta<C> {
  getEngine();
  return {
    // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
    tags: ['autodocs'],
    parameters: {
      // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
      layout: 'fullscreen',
    },
    decorators: [
      applicationConfig(appConfig),
      moduleMetadata({
        //Imports both components to allow component composition with Storybook
        imports: [...imports, ForAngularModule, ComponentsModule],
        providers: [{ provide: RouterService, useValue: RouterService }]
      }),
      // Wraps our stories with a decorator
      componentWrapperDecorator(
        (story) => type === "component" ? story :
          `<ion-app>
            <ion-content [fullscreen]="true">
              <main class="main">
                <app-container [hasSideMenu]="true" size="expand">
                  ${story}
                </app-container>
              </main>
            </ion-content>
          </ion-app>`
      ),
    ],
    args: args || {}
  }
}
