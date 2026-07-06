import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { applicationConfig, componentWrapperDecorator, Meta, moduleMetadata } from '@storybook/angular';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { LogoComponent } from 'src/app/components/logo/logo.component';
import { RouterService } from 'src/app/services/router.service';
import { NgxRenderingEngine } from 'src/lib/engine';
import { ForAngularCommonModule } from 'src/lib/for-angular-common.module';
import { StorybookAppConfig } from './storybook-app.config';

function getEngine(): void {
  let engine;
  try {
    engine = new NgxRenderingEngine();
    Model.setBuilder(Model.fromModel as ModelBuilderFunction);
  } catch (e: unknown) {
    console.warn(`Engine already loaded`);
  }
}

export function getComponentMeta<C>(
  imports: unknown[] = [],
  type: 'component' | 'page' = 'component',
  args: any = {}
): Meta<C> {
  getEngine();
  return {
    tags: ['autodocs'],
    parameters: {
      // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
      layout: 'fullscreen',
    },
    decorators: [
      applicationConfig(StorybookAppConfig),
      moduleMetadata({
        //Imports both components to allow component composition with Storybook
        imports: [
          ...imports,
          ForAngularCommonModule,
          HeaderComponent,
          ContainerComponent,
          BackButtonComponent,
          LogoComponent,
        ],
        providers: [{ provide: RouterService, useValue: RouterService }],
      }),
      // Wraps our stories with a decorator
      componentWrapperDecorator((story) =>
        type === 'component'
          ? story
          : `<ion-app>
            <ion-content [fullscreen]="true">
               <main>
                <app-container size="expand">
                  ${story}
                </app-container>
              </main>
            </ion-content>
          </ion-app>`
      ),
    ],
    args: args || {},
  };
}
