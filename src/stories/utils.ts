import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { applicationConfig, componentWrapperDecorator, Meta, moduleMetadata } from '@storybook/angular';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { LogoComponent } from 'src/app/components/logo/logo.component';
import { RouterService } from 'src/app/services/router.service';
import { ContainerComponent } from 'src/lib/components/container/container.component';
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
  type: 'component' | 'page' | 'modal' = 'component',
  args: any = {},
  providers: any[] = []
): Meta<C> {
  getEngine();
  return {
    tags: ['autodocs'],
    parameters: {
      // Page and modal hosts own the full viewport: Ionic's `ion-content`
      // measures zero inside Storybook's padded, auto-height story root.
      layout: type === 'component' ? 'padded' : 'fullscreen',
    },
    argTypes: {
      // FormGroup/FormControl instances hold circular `_parent` references that crash the
      // Controls addon (`Converting circular structure to JSON`) when it tries to serialize them.
      formGroup: { control: false, table: { disable: true } },
      formControl: { control: false, table: { disable: true } },
      parentForm: { control: false, table: { disable: true } },
    } as Meta<C>['argTypes'],
    decorators: [
      applicationConfig(StorybookAppConfig),
      // Story-scoped providers must live on the application injector, not only
      // on the story's module injector: root-scoped services (`providedIn:
      // "root"`) resolve their tokens in the application injector, so a module
      // binding such as `GRAPH_BACKEND_URL` is invisible to them.
      ...(providers.length ? [applicationConfig({ providers })] : []),
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
        providers: [{ provide: RouterService, useValue: RouterService }, ...providers],
      }),
      // Wraps our stories with a decorator.
      //
      // Page stories already render their own `<ion-content fullscreen>`, so a
      // second Ionic content wrapper would collapse the inner host to zero
      // height. Give `<ion-app>` the viewport instead. Modal-style components
      // render `<ion-header>` + `<ion-content>` themselves and need a flex
      // column with an explicit height for the content to fill the remainder.
      componentWrapperDecorator((story) =>
        type === 'component'
          ? story
          : type === 'page'
            ? `<ion-app style="display:block;height:100vh;width:100%">${story}</ion-app>`
            : `<ion-app style="display:block;height:100vh;width:100%">
                <div style="display:flex;flex-direction:column;height:100vh;width:100%">${story}</div>
              </ion-app>`
      ),
    ],
    args: args || {},
  };
}
