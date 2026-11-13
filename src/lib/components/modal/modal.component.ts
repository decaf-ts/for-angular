import {
  AfterViewChecked,
  Component,
  effect,
  ElementRef,
  EnvironmentInjector,
  EventEmitter,
  inject,
  Input,
  isDevMode,
  OnInit,
  Output,
  QueryList,
  runInInjectionContext,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { Color, modalController, OverlayEventDetail } from '@ionic/core';
import { TranslatePipe } from '@ngx-translate/core';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import { ComponentEventNames, IDecafModal, UIFunctionLike, uihandlers } from '@decaf-ts/ui-decorators';
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
import { ActionRoles, DefaultModalOptions, ListComponentsTypes } from '../../engine/constants';
import { Dynamic } from '../../engine/decorators';
import { IBaseCustomEvent } from '../../engine/interfaces';
import { NgxFormDirective } from '../../engine/NgxFormDirective';
import { NgxParentComponentDirective } from '../../engine/NgxParentComponentDirective';
import { NgxRenderingEngine } from '../../engine/NgxRenderingEngine';
import { CrudEvent, KeyValue, SelectOption } from '../../engine/types';
import { removeFocusTrap } from '../../utils/helpers';
import { ComponentRendererComponent } from '../component-renderer/component-renderer.component';
import { CrudFormComponent } from '../crud-form/crud-form.component';
import { IconComponent } from '../icon/icon.component';
import { ListComponent } from '../list/list.component';
import { ModelRendererComponent } from '../model-renderer/model-renderer.component';

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
 * - Only `string` inline content is sanitized (by Angular); `HTMLElement` content is images-only and rebuilt inert (handlers dropped, non-image content dropped with a dev warning); `SafeHtml` is NOT sanitized (developer-trusted)
 * - Modal dismissal can be handled through cancel or confirm actions
 * - Global configuration can be passed through the globals input
 *
 * @public
 */
export class ModalComponent extends NgxParentComponentDirective implements IDecafModal, OnInit, AfterViewChecked {
  /**
   * @description Reference to the rendered Ionic modal instance.
   * @summary Captures the underlying `IonModal` so the component can control presentation and dismissal.
   * @type {IonModal}
   * @private
   */
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
  options?: Partial<ModalOptions>;

  /**
   * @description Global key-value pairs for modal configuration.
   * @summary Stores global settings that can be accessed within the modal instance.
   * @type {KeyValue | undefined}
   */
  @Input()
  globals?: KeyValue;

  /**
   * @description Inline content to be displayed in the modal.
   * @summary Specifies the string, HTMLElement, or SafeHtml content to be rendered inside the modal.
   * `string` is sanitized by Angular (images, structure and safe links render; scripts and
   * handlers are stripped). `HTMLElement` is an **images-only** channel: every `img`/`svg`/`canvas`
   * found in the element is rebuilt as a fresh, inert `<img>` (handlers and styles from the source
   * node are dropped) and non-image content fails closed with a dev warning — safe for untrusted
   * data by construction. `SafeHtml` is rendered as-is and is NOT sanitized: developer-trusted,
   * never build it from untrusted data.
   * @type {string | HTMLElement | SafeHtml | undefined}
   */
  @Input()
  inlineContent?: string | HTMLElement | SafeHtml;

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
   * @description Controls whether modal content renders with visual borders.
   * @summary When set to true, border styles are applied according to inherited
   * component styling rules; when false, border rendering is disabled.
   * @type {boolean}
   * @default true
   */
  @Input()
  override borders: boolean = true;

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

  /**
   * @description Event handlers registered on the modal instance.
   * @summary Allows consumers to attach custom UI handler functions to the modal lifecycle and actions.
   * @type {Record<string, UIFunctionLike>}
   */
  @Input()
  override handlers: Record<string, UIFunctionLike> = {};

  /**
   * @description Creates a new modal component instance.
   * @summary Initializes the base parent directive with the component name used by the rendering engine.
   */
  constructor() {
    super('ModalComponent');
  }

  /**
   * @description Lifecycle hook that initializes the modal component.
   * @summary Sets up the modal controller and sanitizes inline content if provided.
   *
   * @returns {Promise<void>} - A promise that resolves when initialization is complete.
   */
  @ViewChildren('inlineContentHost')
  inlineContentHost?: QueryList<ElementRef<HTMLElement>>;

  /**
   * @description Whether the inline content is a live DOM element.
   * @summary Element content no longer attaches live: the element path is
   * images-only and every image is rebuilt as a fresh, inert `<img>` (see
   * {@link ModalComponent.extractRenderableImages}).
   */
  get inlineContentIsElement(): boolean {
    return typeof HTMLElement !== 'undefined' && this.inlineContent instanceof HTMLElement;
  }

  ngAfterViewChecked(): void {
    this.attachInlineElementContent();
  }

  async ngOnInit(): Promise<void> {
    // SafeHtml still bypasses Angular's sanitizer via [innerHTML]: developer-trusted only.
    if (isDevMode() && this.inlineContent && typeof this.inlineContent !== 'string' && !this.inlineContentIsElement)
      console.warn(
        '[ngx-decaf-modal] inlineContent is SafeHtml and bypasses Angular sanitization (developer-trusted only). Never build it from untrusted data.'
      );
    await super.initialize();
  }

  /** Whether the images-only element content was already attached (or dropped) for this content. */
  private inlineElementAttached = false;

  /**
   * @description Attaches element inline content into the rendered host.
   * @summary **Images-only, execution-proof channel.** Every image found in the
   * element (`img`, `svg`, `canvas`, including inside wrappers) is rebuilt as a
   * fresh `<img>` carrying only `src`/`alt`/`width`/`height` — event handlers,
   * styles and any other attributes from the source node are dropped, so
   * nothing hostile can survive the handoff. SVG keeps vector quality via a
   * `data:image/svg+xml` source (SVG rendered inside `<img>` is script-inert
   * and cannot load external resources, per the browser image sandbox). Any
   * non-image content fails closed: it is dropped with a dev-mode warning —
   * text/HTML inline content belongs on the sanitized string path.
   * Idempotent: runs after every view check but attaches (or warns) only once per content.
   */
  private attachInlineElementContent(): void {
    if (!this.inlineContentIsElement || this.inlineElementAttached) return;
    const host = this.inlineContentHost?.first?.nativeElement;
    const element = this.inlineContent as HTMLElement;
    if (!host) return;
    const images = ModalComponent.extractRenderableImages(element);
    this.inlineElementAttached = true;
    if (!images.length) {
      if (isDevMode())
        console.warn(
          '[ngx-decaf-modal] HTMLElement inlineContent contained no renderable image and was dropped (images-only element path; use the string inlineContent path for text/HTML).'
        );
      return;
    }
    for (const img of images) host.appendChild(img);
  }

  /**
   * @description Rebuilds all image content of an element as fresh, inert `<img>` nodes.
   * @summary Accepts an `img`/`svg`/`canvas` element directly or extracts such nodes
   * from a wrapper. `img` sources are copied by DOM property (never re-parsed as
   * markup); SVG is serialized to a `data:image/svg+xml` source and canvas is
   * rasterized to a PNG data URL. Only `src`, `alt`, `width` and `height` carry
   * over — inline handlers and styles from the source node never do, so the
   * returned nodes are execution-proof regardless of where the element came from.
   * Nodes that cannot be converted (e.g. a tainted canvas) are skipped.
   *
   * @param {HTMLElement} element - The element content passed to the modal.
   * @return {HTMLImageElement[]} Fresh image nodes, in document order; empty when
   * the element contains no renderable image.
   */
  static extractRenderableImages(element: HTMLElement): HTMLImageElement[] {
    const tag = (el: Element) => el.tagName.toLowerCase();
    const isImageTag = (el: Element) => ['img', 'svg', 'canvas'].includes(tag(el));
    const candidates: Element[] = isImageTag(element)
      ? [element]
      : Array.from(element.querySelectorAll('img, svg, canvas'));

    const out: HTMLImageElement[] = [];
    for (const el of candidates) {
      const img = document.createElement('img');
      try {
        if (tag(el) === 'img') {
          img.src = (el as HTMLImageElement).src;
          img.alt = el.getAttribute('alt') ?? '';
        } else if (tag(el) === 'svg') {
          const serialized = new XMLSerializer().serializeToString(el);
          img.src = `data:image/svg+xml;base64,${ModalComponent.encodeBase64Utf8(serialized)}`;
          img.alt = 'inline svg content';
        } else {
          img.src = (el as HTMLCanvasElement).toDataURL('image/png');
          img.alt = 'inline canvas content';
        }
      } catch (e: unknown) {
        continue;
      }
      const width = Number(el.getAttribute('width'));
      const height = Number(el.getAttribute('height'));
      if (width > 0) img.width = width;
      if (height > 0) img.height = height;
      out.push(img);
    }
    return out;
  }

  /**
   * @description Base64-encodes a string as UTF-8.
   * @summary `btoa` alone throws on non-Latin1 characters; this encodes through
   * UTF-8 bytes first so serialized SVG (which may carry any Unicode text)
   * survives intact.
   *
   * @param {string} value - The string to encode.
   * @return {string} The base64 representation of the UTF-8 encoded string.
   */
  private static encodeBase64Utf8(value: string): string {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
    return btoa(binary);
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
    let handlers = this.globals?.['handlers'] || this.handlers;

    // binding custom handlers to the model
    if (Object.keys(handlers).length) {
      handlers = typeof this.handlers === 'function' ? { confirm: handlers } : handlers;
      uihandlers(handlers)((this.model as Model).constructor);
    }
    if (this.globals?.['props']) {
      this.globals['props'] = Object.assign({}, this.globals['props'], { isModalChild: true });
    }
    if (!this.model && this.globals?.['model']) this.model = this.globals?.['model'];

    if (this.expandable && !this.className.includes('dcf-modal-expand'))
      this.className = `${this.className} dcf-modal-expand`;
    if (['primary', 'secondary', 'tertiary', 'danger', 'medium', 'dark'].includes(this.headerBackground))
      this.iconColor = 'light';
  }

  /**
   * @description Normalizes inline modal content.
   * @summary Superseded: `string` content is sanitized by Angular's [innerHTML] binding;
   * `HTMLElement` content is rebuilt images-only by `attachInlineElementContent` (fresh inert
   * `<img>`, non-image content fails closed); `SafeHtml` remains developer-trusted and is never
   * sanitized — never build it from untrusted data.
   *
   * @returns {void} - Does not return a value.
   * @deprecated
   */
  parseInlineContent(): void {
    // HTMLElement content no longer attaches live: attachInlineElementContent rebuilds every
    // img/svg/canvas as a fresh inert <img> (a sanitizer round-trip would strip SVG and empty
    // the modal body — the barcode-preview regression this deprecated method once caused).
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
    const modal = this as ModalComponent;
    runInInjectionContext(this.injector, () => {
      effect(async () => {
        const event = this.popStateSignal();
        if (event) {
          await modal.cancel();
        }
      });
    });
    return modal;
  }

  /**
   * @description Presents the modal.
   * @summary Sets the modal's visibility to true and triggers change detection.
   *
   * @returns {Promise<void>} - A promise that resolves when the modal is presented.
   */
  async present(): Promise<void> {
    removeFocusTrap();
    this.parseInlineContent();
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
  override async handleEvent(event: CustomEvent & IBaseCustomEvent): Promise<void> {
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

/**
 * @description Retrieves a modal component instance.
 * @summary Creates and initializes a modal component with the provided properties and options.
 *
 * @param {Partial<ModalComponent>}- Properties to initialize the modal component.
 * @param {Partial<ModalOptions>} [modalProps={}] - Additional modal options.
 * @param {EnvironmentInjector} [injector] - Optional environment injector for dependency injection.
 * @returns {Promise<IonModal>} - A promise that resolves with the modal instance.
 */
export async function getNgxModalComponent(
  props: Partial<ModalComponent> = {},
  modalProps: Partial<ModalOptions> = {},
  injector?: EnvironmentInjector
): Promise<IonModal> {
  const { globals } = { ...props };
  if (!globals || !globals?.['operation']) props.globals = { ...(globals || {}), operation: OperationKeys.CREATE };
  const component = await (
    NgxRenderingEngine.createComponent(ModalComponent, props, injector || undefined) as ModalComponent
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
export async function getNgxModalCrudComponent<M extends Model>(
  model: Partial<M>,
  props: Partial<ModalComponent> = {},
  formProps: Partial<CrudFormComponent> = {},
  modalProps: Partial<ModalOptions> = {},
  injector?: EnvironmentInjector
): Promise<IonModal> {
  if (!props || !props?.['operation']) {
    props.operation = OperationKeys.CREATE;
  }
  const { handlers } = props;
  // if has not custom handlers passed, create a generic confirm handler for crud operations and bind it to the model using uihandlers decorator
  if (Model.isModel(model) && !handlers) {
    uihandlers({
      [ComponentEventNames.Submit]: (event: CrudEvent<M>, data: M, instance: NgxFormDirective) => {
        instance.listenEvent.emit(event);
      },
    })(model.constructor);
  }
  const component = await (
    NgxRenderingEngine.createComponent(
      ModalComponent,
      {
        model,
        globals: formProps,
        props: props,
      },
      injector || undefined
    ) as ModalComponent
  ).create(modalProps);
  return component.modal;
}

/**
 * @description Presents a lightbox modal with inline content.
 * @summary Displays a modal in lightbox mode with the specified content and properties.
 * `string` content is sanitized by Angular. `HTMLElement` content is images-only: every
 * img/svg/canvas is rebuilt as a fresh inert `<img>` (handlers dropped; non-image content fails
 * closed with a dev warning), so it is safe for untrusted data. `SafeHtml` is NOT sanitized:
 * developer-trusted — never build it from untrusted data.
 *
 * @param {string | HTMLElement | SafeHtml} inlineContent - The content to display in the lightbox modal.
 * @param {Partial<ModalComponent>} [props={}] - Properties to initialize the modal component.
 * @param {EnvironmentInjector} [injector] - Optional environment injector for dependency injection.
 * @returns {Promise<void>} - A promise that resolves when the modal is presented.
 */
export async function presentNgxLightBoxModal(
  inlineContent: string | HTMLElement | SafeHtml,
  props: Partial<ModalComponent> = {},
  injector?: EnvironmentInjector
): Promise<void> {
  return (
    await getNgxModalComponent({ ...props, inlineContent, lightBox: true }, {}, injector || undefined)
  ).present();
}

/**
 * @description Presents modal with inline content.
 * @summary Displays a modal with the specified content and properties.
 * `string` content is sanitized by Angular. `HTMLElement` content is images-only: every
 * img/svg/canvas is rebuilt as a fresh inert `<img>` (handlers dropped; non-image content fails
 * closed with a dev warning), so it is safe for untrusted data. `SafeHtml` is NOT sanitized:
 * developer-trusted — never build it from untrusted data.
 *
 * @param {string | HTMLElement | SafeHtml} inlineContent - The content to display in the modal.
 * @param {Partial<ModalComponent>} [props={}] - Properties to initialize the modal component.
 * @param {EnvironmentInjector} [injector] - Optional environment injector for dependency injection.
 * @returns {Promise<void>} - A promise that resolves when the modal is presented.
 */
export async function presentNgxInlineModal(
  inlineContent: string | HTMLElement | SafeHtml,
  props: Partial<ModalComponent> = {},
  injector?: EnvironmentInjector
): Promise<void> {
  (await getNgxInlineModal(inlineContent, props, injector)).present();
}

/**
 * @description get modal with inline content instance.
 * @summary Get modal component instance for show inline content.
 * `string` content is sanitized by Angular. `HTMLElement` content is images-only: every
 * img/svg/canvas is rebuilt as a fresh inert `<img>` (handlers dropped; non-image content fails
 * closed with a dev warning), so it is safe for untrusted data. `SafeHtml` is NOT sanitized:
 * developer-trusted — never build it from untrusted data.
 *
 * @param {string | HTMLElement | SafeHtml} inlineContent - The content to display in the lightbox modal.
 * @param {Partial<ModalComponent>} [props={}] - Properties to initialize the modal component.
 * @param {EnvironmentInjector} [injector] - Optional environment injector for dependency injection.
 * @returns {Promise<IonModal>} - A promise that resolves when the modal is presented.
 */
export async function getNgxInlineModal(
  inlineContent: string | HTMLElement | SafeHtml,
  props: Partial<ModalComponent> = {},
  injector?: EnvironmentInjector
): Promise<IonModal> {
  return await getNgxModalComponent(
    {
      ...props,
      inlineContent: inlineContent ?? '<div></div>',
      className: `${props?.className ?? ''} dcf-modal`,
    },
    {},
    injector || undefined
  );
}

/**
 * @description Retrieves a modal for selecting options.
 * @summary Creates and initializes a modal component for displaying a list of selectable options.
 *
 * @param {SelectOption[]} options - The list of options to display in the modal.
 * @param {EnvironmentInjector} injector - Optional environment injector for dependency injection.
 * @returns {Promise<IonModal>} - A promise that resolves with the modal instance.
 */
export async function getNgxSelectOptionsModal(
  title: string,
  options: SelectOption[] | Model | string,
  globals: Partial<ListComponent> = {},
  uid?: string,
  injector?: EnvironmentInjector
): Promise<IonModal> {
  if (Array.isArray(options)) {
    globals.data = options;
  } else {
    globals.model = options;
  }
  const props = {
    tag: 'ngx-decaf-list',
    title,
    globals: {
      data: [],
      showSearchbar: true,
      // showSearchbar: options?.length > 10,
      item: { tag: true, emitEvent: true, pk: globals?.['pk'] },
      pk: 'value',
      mapper: { title: 'text', uid: 'value' },
      ...globals,
      empty: { showButton: false },
      limit: 25,
      type: ListComponentsTypes.INFINITE,
      isModalChild: true,
    } as Partial<ListComponent>,
    className: `dcf-modal dcf-modal-select-interface ${uid ? `dcf-modal-${uid.toLowerCase()}` : ''}`,
  };
  const component = await (
    NgxRenderingEngine.createComponent(ModalComponent, props, injector || undefined) as ModalComponent
  ).create(props);
  const modal = component.modal;
  await modal.present();
  const childComponent = component.component?.nativeElement;
  if (childComponent) {
    const searchbar = childComponent.querySelector('ion-searchbar input') as HTMLInputElement;
    if (searchbar) {
      searchbar.focus();
    }
  }
  return modal;
}
