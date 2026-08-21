/**
 * @module app/user-requests/user-request-rendering-context
 * @summary Angular app-side rendering-engine facade implementing the shared
 * `RenderingFacade` contract from `@decaf-ts/ui-decorators/user-requests`.
 * @description Backs `getModal` with the generic library modal (reusing
 * `ModalComponent` + `ModelRendererComponent`), `getToast` with the library
 * `NgxToast` singleton, `getSpinner` with the library `NgxSpinner` singleton
 * and `router` with the library `NgxRouterService`.
 */

import { Injectable } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { EnvironmentInjector } from '@angular/core';
import { ValidationError } from '@decaf-ts/db-decorators';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import {
  ComponentEventNames,
  DecafComponent,
  DecafSpinnerOptions,
  DecafToastOptions,
  IDecafModal,
  IDecafRouter,
  IDecafSpinner,
  IDecafToast,
} from '@decaf-ts/ui-decorators';
import type { RenderingFacade } from '@decaf-ts/ui-decorators/user-requests';
import { ModalComponent } from 'src/lib/components';
import { NgxComponentDirective } from 'src/lib/engine/NgxComponentDirective';
import { NgxRenderingEngine } from 'src/lib/engine/NgxRenderingEngine';
import { IBaseCustomEvent } from 'src/lib/engine/interfaces';
import { CrudEvent, KeyValue } from 'src/lib/engine/types';
import { NgxRouterService } from 'src/lib/services/NgxRouterService';
import { getNgxSpinner } from 'src/lib/utils/NgxSpinner';
import { getNgxToast } from 'src/lib/utils/NgxToast';

/**
 * Resolves the model a generic modal should render, reading it wherever the
 * shared request pipeline carries it: directly on the component, on its props
 * or — as the shared handler does — inside the carried request payload.
 */
function resolveRequestModel(component: Partial<DecafComponent<Model>>): Model | undefined {
  const direct = component.model;
  if (Model.isModel(direct as unknown as Record<string, unknown>)) return direct as Model;
  const props = (component as KeyValue)['props'] as KeyValue | undefined;
  if (props) {
    const propModel = props['model'];
    if (Model.isModel(propModel as unknown as Record<string, unknown>)) return propModel as Model;
    const request = props['request'] as { payload?: Model } | undefined;
    const payload = request?.payload;
    if (Model.isModel(payload as unknown as Record<string, unknown>)) return payload as Model;
  }
  return undefined;
}

/**
 * @summary Angular app-side rendering-engine facade for user requests.
 * @description Implements the engine's `RenderingFacade` surface
 * (`getModal`/`getToast`/`getSpinner`/`router`) backed by the live app,
 * exercising the exact code path of the shared ui-decorators handlers against
 * the generic library UI. `getModal` hosts the model renderer for whatever
 * model the request carries and routes engine events to the shared resolution
 * semantics: submit dismisses with the submitted data, cancel with the
 * `cancel` role and an invalid form submission with a `ValidationError` under
 * the `error` role. `getToast`/`getSpinner` return the library singletons and
 * `router` resolves the `NgxRouterService` from the Angular environment.
 */
@Injectable()
export class AngularUserRequestRenderingContext implements RenderingFacade {
  constructor(private readonly environmentInjector: EnvironmentInjector) {}

  /**
   * @summary Returns the library toast singleton configured with the given
   * options.
   * @param {DecafToastOptions} options - Toast presentation options (message,
   * colour, duration, position…).
   * @returns {Promise<IDecafToast>} A promise resolving to the library toast.
   */
  async getToast(options: DecafToastOptions): Promise<IDecafToast> {
    return getNgxToast(options);
  }

  /**
   * @summary Returns the library spinner singleton.
   * @param {DecafSpinnerOptions} _options - Spinner options (kept for the
   * engine contract; the singleton configures itself).
   * @returns {Promise<IDecafSpinner>} A promise resolving to the library
   * spinner.
   */
  async getSpinner(_options: DecafSpinnerOptions): Promise<IDecafSpinner> {
    return getNgxSpinner();
  }

  /**
   * @summary Returns the current Angular router (Ionic-aware).
   * @returns {IDecafRouter} The `NgxRouterService` instance from the Angular
   * environment injector.
   */
  router(): IDecafRouter {
    return this.environmentInjector.get(NgxRouterService);
  }

  /**
   * Presents the generic library modal hosting the model renderer for the
   * model the request carries.
   * @summary Creates and presents `ModalComponent` with the resolved model
   * under the CREATE operation, binds the generic submit/validation handlers
   * and makes the modal physically leave the DOM on dismissal.
   *
   * The modal is rendered inline via a `[isOpen]` binding, so Ionic only
   * unmounts it once the bound `isOpen` flips back to `false` (followed by
   * change detection) and the engine's dynamically created host element is
   * removed from `ion-app`. `confirm` also re-throws any decaf error carried
   * by the submitted event (e.g. a `ValidationError` from an invalid stepped
   * form): the shared handler wraps `confirm`, so a throw rejects the pending
   * request instead of resolving it with an error as data.
   * @template C - The component type carrying the model to render (must extend
   * `DecafComponent<Model>`); the resolver reads the model from
   * `component.model`, `component.props.model` or
   * `component.props.request.payload`.
   * @param {Partial<C>} component - The component partial carrying the model
   * (`component.model`, `component.props.model` or
   * `component.props.request.payload`).
   * @param {...unknown[]} _args - Extra rendering arguments (kept for the
   * engine contract; unused by this facade).
   * @returns {Promise<IDecafModal>} The presented modal, ready to be driven
   * through the shared confirm/cancel/error resolution semantics.
   * @throws {ValidationError} When the request carries no resolvable model in
   * its payload.
   * @throws {Error} Re-throws the decaf error carried by a `confirm` event so
   * the shared handler rejects the pending request instead of resolving it
   * with an error as data.
   */
  async getModal<C extends DecafComponent<Model>>(
    component: Partial<C>,
    ..._args: unknown[]
  ): Promise<IDecafModal> {
    const model = resolveRequestModel(component);
    if (!model)
      throw new ValidationError(
        'Cannot present a user request modal without a model: none found in the request payload',
      );

    const inputs = component as KeyValue;
    const modal = (await NgxRenderingEngine.createComponent(
      ModalComponent,
      {
        model,
        title: (inputs['title'] as string | undefined) ?? 'user-request.title',
        globals: {
          ...((inputs['globals'] as KeyValue | undefined) ?? {}),
          operation: OperationKeys.CREATE,
          isModalChild: true,
          notifyOnInvalidSubmit: true,
          handlers: {
            [ComponentEventNames.Submit]: (event: CrudEvent<Model>, _data: Model, instance: NgxComponentDirective) => {
              instance.listenEvent.emit(event);
            },
            [ComponentEventNames.ValidationError]: (
              event: CrudEvent<Model>,
              _data: Model,
              instance: NgxComponentDirective,
            ) => {
              instance.listenEvent.emit(event);
            },
          },
        } as KeyValue,
      } as Partial<ModalComponent>,
      this.environmentInjector,
    )) as ModalComponent;

    const originalConfirm = modal.confirm.bind(modal);
    const originalCancel = modal.cancel.bind(modal);

    /* Takes the inline `[isOpen]`-driven modal out of the DOM for good. */
    const teardownModal = (): void => {
      modal.isOpen = false;
      (modal as unknown as { changeDetectorRef: ChangeDetectorRef }).changeDetectorRef.detectChanges();
      let wrapper = document.getElementById(String(modal.uid));
      while (
        wrapper?.parentElement &&
        wrapper.parentElement.tagName.toLowerCase() !== 'ion-app'
      ) {
        wrapper = wrapper.parentElement;
      }
      if (
        wrapper &&
        wrapper.parentElement?.tagName.toLowerCase() === 'ion-app'
      ) {
        wrapper.remove();
      }
    };

    modal.confirm = async (event?: IBaseCustomEvent): Promise<void> => {
      try {
        await originalConfirm(event);
      } finally {
        teardownModal();
      }
      if (event?.data instanceof Error) throw event.data;
    };

    modal.cancel = async (): Promise<void> => {
      try {
        await originalCancel();
      } finally {
        teardownModal();
      }
    };

    await modal.create();
    return modal as unknown as IDecafModal;
  }
}
