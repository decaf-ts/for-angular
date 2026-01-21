import {
  Component,
  EnvironmentInjector,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Color, modalController, OverlayEventDetail } from '@ionic/core';

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalOptions,
} from '@ionic/angular/standalone';
import { ModelRendererComponent } from '../model-renderer/model-renderer.component';
import { NgxRenderingEngine } from '../../engine/NgxRenderingEngine';
import { Dynamic } from '../../engine/decorators';
import { ActionRole, KeyValue, SelectOption } from '../../engine/types';
import { IBaseCustomEvent } from '../../engine/interfaces';
import { ActionRoles, DefaultModalOptions, ListComponentsTypes } from '../../engine/constants';
import { NgxParentComponentDirective } from '../../engine/NgxParentComponentDirective';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { ComponentRendererComponent } from '../component-renderer/component-renderer.component';
import { IconComponent } from '../icon/icon.component';

/**
 * @description Modal component for displaying dynamic content in a modal dialog.
 * @summary This component provides a flexible and reusable modal dialog implementation
 * for Angular applications. It supports dynamic content rendering, customizable options,
 * and event handling for modal lifecycle events. The modal can be used for various purposes,
 * such as displaying forms, lightboxes, or selection dialogs.
 *
 * @class ModalComponent
 * @example
 * ```typescript
 * <ngx-decaf-modal [isOpen]="true" [title]="'Example Modal'"></ngx-decaf-modal>
 * ```
 * @mermaid
 * sequenceDiagram
 *   participant User
 *   participant ModalComponent
 *   User->>ModalComponent: Open modal
 *   ModalComponent->>ModalController: Initialize modal
 *   ModalController-->>ModalComponent: Modal options set
 *   User->>ModalComponent: Interact with modal
 *   ModalComponent->>ModalController: Handle dismiss event
 */

@Dynamic()
@Component({
  selector: 'ngx-decaf-modal',
  templateUrl: 'modal.component.html',
  styleUrls: ['modal.component.scss'],
  standalone: true,
  imports: [
    IonModal,
    ComponentRendererComponent,
    ModelRendererComponent,
    TranslatePipe,
    IconComponent,
    IonSpinner,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
  ],
  host: { '[attr.id]': 'uid' },
})
/**
 * @description A reusable modal component that wraps Ionic's IonModal functionality.
 * @summary Provides a flexible modal dialog implementation with support for custom content, positioning, fullscreen mode, and lightbox mode. Extends NgxParentComponentDirective to inherit common component functionality.
 *
 * @extends {NgxParentComponentDirective}
 * @implements {OnInit}
 *
 * @example
 * ```typescript
 * // Basic usage in template
 * <app-modal
 *   [isOpen]="showModal"
 *   [title]="'Confirmation'"
 *   [inlineContent]="'Are you sure?'"
 *   (willDismissEvent)="handleDismiss($event)">
 * </app-modal>
 *
 * // Programmatic usage
 * const modal = await modalComponent.create({ title: 'Settings' });
 * ```
 *
 * @remarks
 * - The modal supports inline content that can be positioned at the top or bottom
 * - Fullscreen and lightbox modes are available for different display needs
 * - The component automatically sanitizes HTML content for security
 * - Modal dismissal can be handled through cancel or confirm actions
 * - Global configuration can be passed through the globals input
 *
 * @public
 */
export class ModalComponent extends NgxParentComponentDirective implements OnInit {
  @ViewChild('component')
  modal!: IonModal;

  /**
   * @description Title of the modal dialog.
   * @summary Specifies the title text displayed in the modal header.
   * @type {string | undefined}
   */
  @Input()
  title?: string;

  /**
   * @description Determines whether the modal is open.
   * @summary Controls the visibility of the modal dialog. When set to true, the modal is displayed.
   * @type {boolean}
   * @default false
   */
  @Input()
  isOpen: boolean = false;

  /**
   * @description Tag identifier for the modal.
   * @summary Provides a unique tag for identifying the modal instance.
   * @type {string | undefined}
   */
  @Input()
  tag?: string;

  /**
   * @description Options for configuring the modal.
   * @summary Allows customization of modal behavior and appearance through the ModalOptions interface.
   * @type {ModalOptions | undefined}
   */
  @Input()
  options?: ModalOptions;

  /**
   * @description Global key-value pairs for modal configuration.
   * @summary Stores global settings that can be accessed within the modal instance.
   * @type {KeyValue | undefined}
   */
  @Input()
  globals?: KeyValue;

  /**
   * @description Inline content to be displayed in the modal.
   * @summary Specifies the HTML or SafeHtml content to be rendered inside the modal.
   * @type {string | SafeHtml | undefined}
   */
  @Input()
  inlineContent?: string | SafeHtml;

  /**
   * @description Position of the inline content within the modal.
   * @summary Determines whether the inline content is displayed at the top or bottom of the modal.
   * @type {'top' | 'bottom'}
   * @default 'bottom'
   */
  @Input()
  inlineContentPosition: 'top' | 'bottom' = 'bottom';

  /**
   * @description Enables fullscreen mode for the modal.
   * @summary When set to true, the modal occupies the entire screen.
   * @type {boolean}
   * @default false
   */
  @Input()
  fullscreen: boolean = false;

  /**
   * @description Enables expandable mode for the modal.
   * @summary When set to true, the modal can be expanded.
   * @type {boolean}
   * @default false
   */
  @Input()
  expandable: boolean = false;

  /**
   * @description Enables lightbox mode for the modal.
   * @summary When set to true, the modal is displayed as a lightbox.
   * @type {boolean}
   * @default false
   */
  @Input()
  lightBox: boolean = false;

  /**
   * @description Controls the transparency of the modal header.
   * @summary When set to true, the modal header is rendered with a transparent background.
   * @type {boolean}
   * @default false
   */
  @Input()
  headerTransparent: boolean = false;

  /**
   * @description Sets the background color of the modal header.
   * @summary Controls the Ionic color used for the modal header background.
   * @type {Color}
   * @default 'transparent'
   */
  @Input()
  headerBackground: Color = 'transparent';

  /**
   * @description Controls the visibility of the modal header.
   * @summary When set to true, the modal header is displayed; when false, it is hidden.
   * @type {boolean}
   * @default true
   */
  @Input()
  showHeader: boolean = true;

  /**
   * @description Controls the visibility of the modal close button.
   * @summary When true, the close (X) button renders in the header; when false, it is omitted.
   * @type {boolean}
   * @default true
   */
  @Input()
  showCloseButton: boolean = true;

  /**
   * @description Event emitted when the modal is about to be dismissed.
   * @summary Emits an OverlayEventDetail object containing details about the dismiss event.
   * @type {EventEmitter<OverlayEventDetail>}
   */
  @Output()
  willDismissEvent: EventEmitter<OverlayEventDetail> = new EventEmitter<OverlayEventDetail>();

  /**
   * @description Sanitizer instance for bypassing security and sanitizing HTML content.
   * @summary Used to sanitize dynamic HTML content, ensuring it is safe to render in the DOM.
   * @type {DomSanitizer}
   */
  domSanitizer: DomSanitizer = inject(DomSanitizer);

  /**
   * @description Indicates whether the modal content is expanded.
   * @summary When set to true, the modal displays in an expanded state; when false, it is collapsed or in its default size.
   * @type {boolean}
   */
  expanded: boolean = false;

  /**
   * @description Defines the color used for icons within the modal.
   * @summary Controls the Ionic color of icons rendered in the modal (for example, in the header or action buttons).
   * @type {Color}
   */
  iconColor: Color = 'dark';

  constructor() {
    super('ModalComponent');
  }

  /**
   * @description Lifecycle hook that initializes the modal component.
   * @summary Sets up the modal controller and sanitizes inline content if provided.
   *
   * @returns {Promise<void>} - A promise that resolves when initialization is complete.
   */
  override async ngOnInit(): Promise<void> {
    if (this.inlineContent && typeof this.inlineContent === Primitives.STRING)
      this.inlineContent = this.domSanitizer.bypassSecurityTrustHtml(this.inlineContent as string);
    await super.initialize();
  }

  /**
   * @description Initializes the modal with the provided options.
   * @summary Merges default options with user-provided options and sets global configuration.
   *
   * @param {KeyValue} [options={}] - Additional options for modal initialization.
   * @returns {Promise<void>} - A promise that resolves when initialization is complete.
   */
  async prepare(options: KeyValue = {}): Promise<void> {
    this.options = Object.assign({}, DefaultModalOptions, this.options, options);
    this.globals = Object.assign({}, this.globals || {}, { isModalChild: true });
    if (this.globals?.['props']) {
      this.globals['props'] = Object.assign({}, this.globals['props'], { isModalChild: true });
    }
    if (!this.model && this.globals?.['model']) this.model = this.globals?.['model'];

    if (this.expandable && !this.className.includes('dcf-modal-expand'))
      this.className = `${this.className} dcf-modal-expand`;
    if (
      ['primary', 'secondary', 'tertiary', 'danger', 'medium', 'dark'].includes(
        this.headerBackground,
      )
    )
      this.iconColor = 'light';
  }

  /**
   * @description Creates and presents the modal.
   * @summary Initializes the modal with the provided properties and displays it.
   *
   * @param {KeyValue} [props={}] - Properties to initialize the modal.
   * @returns {Promise<ModalComponent>} - A promise that resolves with the modal instance.
   */
  async create(props: KeyValue = {}): Promise<ModalComponent> {
    await this.prepare(props);
    await this.present();
    return this;
  }

  /**
   * @description Presents the modal.
   * @summary Sets the modal's visibility to true and triggers change detection.
   *
   * @returns {Promise<void>} - A promise that resolves when the modal is presented.
   */
  async present(): Promise<void> {
    this.isOpen = true;
    this.changeDetectorRef.detectChanges();
  }

  /**
   * @description Handles custom events for the modal.
   * @summary Stops event propagation and triggers confirm or cancel actions based on event data.
   *
   * @param {IBaseCustomEvent} event - The custom event to handle.
   * @returns {Promise<void>} - A promise that resolves when the event is handled.
   */
  override async handleEvent(event: IBaseCustomEvent): Promise<void> {
    if (event instanceof Event) {
      event.stopImmediatePropagation();
    }
    await (event?.data ? this.confirm(event) : this.cancel());
  }

  /**
   * @description Handles the modal dismiss event.
   * @summary This method is triggered when the modal is about to be dismissed. It emits the `willDismissEvent` with the event details.
   *
   * @param {CustomEvent<OverlayEventDetail>} event - The dismiss event containing overlay details.
   * @returns {Promise<OverlayEventDetail>} - A promise that resolves with the overlay event details.
   */
  async handleWillDismiss(event: CustomEvent<OverlayEventDetail>): Promise<OverlayEventDetail> {
    const { detail } = event;
    this.willDismissEvent.emit((detail?.data || event) as OverlayEventDetail);
    return detail;
  }

  /**
   * @description Toggles the expanded state of the modal content.
   * @summary This method switches the modal between expanded and collapsed views and triggers change detection.
   *
   * @returns {void} - Does not return a value.
   */
  handleExpandToggle(): void {
    this.expanded = !this.expanded;
    this.changeDetectorRef.detectChanges();
  }

  /**
   * @description Cancels the modal and dismisses it with a cancel action.
   * @summary This method is used to programmatically close the modal with a cancel action.
   *
   * @returns {Promise<void>} - A promise that resolves when the modal is dismissed.
   */
  async cancel(): Promise<void> {
    const modal = this.modal || modalController;
    await modal.dismiss(undefined, ActionRoles.cancel);
  }

  /**
   * @description Confirms the modal and dismisses it with a confirm action.
   * @summary This method is used to programmatically close the modal with a confirm action, passing optional event data.
   *
   * @param {IBaseCustomEvent} event - The custom event containing data to pass during confirmation.
   * @returns {Promise<void>} - A promise that resolves when the modal is dismissed.
   */
  async confirm(event?: IBaseCustomEvent): Promise<void> {
    const modal = this.modal || modalController;
    await modal.dismiss(event?.data || undefined, ActionRoles.confirm);
  }
}

@Dynamic()
@Component({
  selector: 'ngx-decaf-modal-confirm',
  templateUrl: 'modal-confirm.component.html',
  standalone: true,
  imports: [TranslatePipe, IonButton],
  host: { '[attr.id]': 'uid' },
})
export class ModalConfirmComponent extends ModalComponent implements OnInit {
  @Input()
  data?: { item?: string; pk?: string; uid?: string };

  @Input()
  role?: CrudOperations;

  @Input()
  message?: string;

  @Input()
  override title?: string;

  override async ngOnInit(): Promise<void> {
    const { uid, item, pk } = this.data || {};
    const role = this.role || OperationKeys.DELETE;
    if (!this.title) {
      this.title = await this.translate(`${this.locale}.confirm.operations.${role}.title`, {
        '0': item,
      });
      this.translatable = false;
    }
    console.log(this.title);
    if (!this.message) {
      this.message = await this.translate(`${this.locale}.confirm.operations.${role}.message`, {
        '0': uid,
        '1': item,
        '2': pk,
      });
      this.translatable = false;
    }
    this.changeDetectorRef.detectChanges();
    await this.initialize();
  }

  async handleAction(role: 'confirm' | 'cancel' = 'confirm'): Promise<void> {
    if (role === ActionRoles.confirm)
      return await this.confirm({
        name: 'ModalConfirmComponent',
        data: {
          role,
          data: this.data,
        },
      });
    return await this.cancel();
  }
}

/**
 * @description Retrieves a modal component instance.
 * @summary Creates and initializes a modal component with the provided properties and options.
 *
 * @param {Partial<ModalComponent>} [props={}] - Properties to initialize the modal component.
 * @param {Partial<ModalOptions>} [modalProps={}] - Additional modal options.
 * @param {EnvironmentInjector} [injector] - Optional environment injector for dependency injection.
 * @returns {Promise<IonModal>} - A promise that resolves with the modal instance.
 */
export async function getNgxModalComponent(
  props: Partial<ModalComponent> = {},
  modalProps: Partial<ModalOptions> = {},
  injector?: EnvironmentInjector,
): Promise<IonModal> {
  const { globals } = { ...props };
  if (!globals || !globals?.['operation'])
    props.globals = { ...(globals || {}), operation: OperationKeys.CREATE };
  const component = await (
    NgxRenderingEngine.createComponent(
      ModalComponent,
      props,
      injector || undefined,
    ) as ModalComponent
  ).create(modalProps);
  return component.modal;
}

/**
 * @description Retrieves a modal component instance.
 * @summary Creates and initializes a modal component with the provided properties and options.
 *
 * @param {Partial<ModalComponent>} [props={}] - Properties to initialize the modal component.
 * @param {Partial<ModalOptions>} [modalProps={}] - Additional modal options.
 * @param {EnvironmentInjector} [injector] - Optional environment injector for dependency injection.
 * @returns {Promise<IonModal>} - A promise that resolves with the modal instance.
 */
export async function getNgxModalCrudComponent(
  model: Partial<Model>,
  props: Partial<ModalComponent> = {},
  modalProps: Partial<ModalOptions> = {},
  injector?: EnvironmentInjector,
): Promise<IonModal> {
  if (!props || !props?.['operation']) props.operation = OperationKeys.CREATE;
  const component = await (
    NgxRenderingEngine.createComponent(
      ModalComponent,
      {
        model,
        globals: props,
      },
      injector || undefined,
    ) as ModalComponent
  ).create(modalProps);
  return component.modal;
}

/**
 * @description Presents a lightbox modal with inline content.
 * @summary Displays a modal in lightbox mode with the specified content and properties.
 *
 * @param {string | SafeHtml} inlineContent - The content to display in the lightbox modal.
 * @param {Partial<ModalComponent>} [props={}] - Properties to initialize the modal component.
 * @param {EnvironmentInjector} [injector] - Optional environment injector for dependency injection.
 * @returns {Promise<void>} - A promise that resolves when the modal is presented.
 */
export async function presentNgxLightBoxModal(
  inlineContent: string | SafeHtml,
  props: Partial<ModalComponent> = {},
  injector?: EnvironmentInjector,
): Promise<void> {
  return (
    await getNgxModalComponent(
      { props, ...{ inlineContent, lightBox: true } },
      {},
      injector || undefined,
    )
  ).present();
}

/**
 * @description Presents modal with inline content.
 * @summary Displays a modal with the specified content and properties.
 *
 * @param {string | SafeHtml} inlineContent - The content to display in the modal.
 * @param {Partial<ModalComponent>} [props={}] - Properties to initialize the modal component.
 * @param {EnvironmentInjector} [injector] - Optional environment injector for dependency injection.
 * @returns {Promise<void>} - A promise that resolves when the modal is presented.
 */
export async function presentNgxInlineModal(
  inlineContent: string | SafeHtml,
  props: Partial<ModalComponent> = {},
  injector?: EnvironmentInjector,
): Promise<void> {
  (await getNgxInlineModal(inlineContent, props, injector)).present();
}

/**
 * @description get modal with inline content instance.
 * @summary Get modal component instance for show inline content
 *
 * @param {string | SafeHtml} inlineContent - The content to display in the lightbox modal.
 * @param {Partial<ModalComponent>} [props={}] - Properties to initialize the modal component.
 * @param {EnvironmentInjector} [injector] - Optional environment injector for dependency injection.
 * @returns {Promise<void>} - A promise that resolves when the modal is presented.
 */
export async function getNgxInlineModal(
  inlineContent: string | SafeHtml,
  props: Partial<ModalComponent> = {},
  injector?: EnvironmentInjector,
): Promise<IonModal> {
  return await getNgxModalComponent(
    {
      props,
      ...{
        inlineContent: inlineContent ?? '<div></div>',
        className: `${props?.className ?? ''} dcf-modal dcf-modal-expand`,
      },
    },
    {},
    injector || undefined,
  );
}

/**
 * @description Retrieves a modal for selecting options.
 * @summary Creates and initializes a modal component for displaying a list of selectable options.
 *
 * @param {SelectOption[]} options - The list of options to display in the modal.
 * @param {EnvironmentInjector} [injector] - Optional environment injector for dependency injection.
 * @returns {Promise<IonModal>} - A promise that resolves with the modal instance.
 */
export async function getNgxSelectOptionsModal(
  title: string,
  options: SelectOption[],
  injector?: EnvironmentInjector,
): Promise<IonModal> {
  const props = {
    tag: 'ngx-decaf-list',
    title,
    globals: {
      data: options,
      showSearchbar: options?.length > 10,
      item: { tag: true, emitEvent: true },
      pk: 'value',
      mapper: { title: 'text', uid: 'value' },
      type: ListComponentsTypes.INFINITE,
      isModalChild: true,
    },
    className: `dcf-modal dcf-modal-select-interface`,
  };
  return await getNgxModalComponent(props, {}, injector || undefined);
}

export async function presentModalConfirm(
  props: Pick<ModalConfirmComponent, 'title' | 'role' | 'data' | 'locale'> = {},
  role: CrudOperations,
  injector?: EnvironmentInjector,
): Promise<IonModal> {
  return await getNgxModalComponent(
    {
      tag: 'ngx-decaf-modal-confirm',
      headerTransparent: true,
      className: `dcf-modal-confirm dcf-${role}`,
      showCloseButton: false,
      globals: Object.assign({}, { role }, props),
    },
    {},
    injector,
  );
}
