import { Directive, EventEmitter, inject, Input, Output } from '@angular/core';
import { LoggedClass, Logger } from '@decaf-ts/logging';
import { KeyValue } from './types';
import { IBaseCustomEvent, ICrudFormEvent } from './interfaces';
import { NgxEventHandler } from './NgxEventHandler';
import { Router } from '@angular/router';
import { getLocaleContext } from '../i18n/Loader';
import { NgxRenderingEngine } from './NgxRenderingEngine';
import { MenuController } from '@ionic/angular';
import { Model } from '@decaf-ts/decorator-validation';

try {
  new NgxRenderingEngine();
} catch (e: unknown) {
  throw new Error(`Failed to load rendering engine: ${e}`);
}

@Directive()
export abstract class NgxDecafComponent extends LoggedClass {

    /**
   * @description Repository model for data operations.
   * @summary The data model repository that this component will use for CRUD operations.
   * This provides a connection to the data layer for retrieving and manipulating data.
   *
   * @type {Model| undefined}
   * @memberOf NgxDecafComponent
   */
  @Input()
  model!: Model | undefined;

  /**
   * @description Root component of the Decaf-ts for Angular application
   * @summary This component serves as the main entry point for the application.
   * It sets up the navigation menu, handles routing events, and initializes
   * the application state. It also manages the application title and menu visibility.
   *
   * @private
   * @type {MenuController}
   * @memberOf NgxDecafComponent
   */
  protected menuController: MenuController = inject(MenuController);

  /**
   * @description Logger instance for the component.
   * @summary Provides logging capabilities for the component, allowing for consistent
   * and structured logging of information, warnings, and errors. This logger is initialized
   * in the ngOnInit method using the getLogger function from the ForAngularCommonModule.
   *
   * The logger is used throughout the component to record important events, debug information,
   * and potential issues. It helps in monitoring the component's behavior, tracking the flow
   * of operations, and facilitating easier debugging and maintenance.
   *
   * @type {Logger}
   * @private
   * @memberOf NgxDecafComponent
   */
  logger!: Logger;

  /**
   * @description Event emitter for custom renderer events.
   * @summary Emits custom events that occur within child components or the layout itself.
   * This allows parent components to listen for and respond to user interactions or
   * state changes within the grid layout. Events are passed up the component hierarchy
   * to enable coordinated behavior across the application.
   *
   * @type {EventEmitter<IBaseCustomEvent>}
   * @memberOf NgxBaseComponent
   */
  @Output()
  listenEvent: EventEmitter<IBaseCustomEvent> = new EventEmitter<IBaseCustomEvent>();

  /**
   * @description Angular Router instance for navigation
   * @summary Injected Router service used for programmatic navigation
   * to other pages after successful login or other routing operations.
   *
   * @private
   * @type {Router}
   * @memberOf NgxDecafComponent
   */
  protected router: Router = inject(Router);

  /**
   * @description Angular Router instance for navigation
   * @summary Injected Router service used for programmatic navigation
   * to other pages after successful login or other routing operations.
   *
   * @private
   * @type {Router}
   * @memberOf NgxDecafComponent
   */
  protected componentName: string = "NgxDecafComponent";

  /**
   * @description Angular Router instance for navigation
   * @summary Injected Router service used for programmatic navigation
   * to other pages after successful login or other routing operations.
   *
   * @private
   * @type {Router}
   * @memberOf NgxDecafComponent
   */
  protected localeRoot!: string;

  /**
   * @description Angular Router instance for navigation
   * @summary Injected Router service used for programmatic navigation
   * to other pages after successful login or other routing operations.
   *
   * @private
   * @type {Router}
   * @memberOf NgxDecafComponent
   */
  locale?: string;

  /**
   * @description Flag indicating if the component has been initialized
   * @summary Tracks whether the component has completed its initialization process.
   * This flag is used to prevent duplicate initialization and to determine if
   * certain operations that require initialization can be performed.
   *
   * @type {boolean}
   * @default false
   * @memberOf NgxDecafComponent
   */
  initialized: boolean = false;


  constructor() {
		super();
    this.logger = this.log;
	}

  get localeContext(){
		if (!this.locale)
			this.locale = getLocaleContext(this.localeRoot || this.componentName)
		return this.locale;
	}

  /**
   * @description Tracks items in ngFor loops for optimal change detection.
   * @summary Provides a tracking function for Angular's *ngFor directive to optimize rendering
   * performance. This method generates unique identifiers for list items based on their index
   * and content, allowing Angular to efficiently track changes and minimize DOM manipulations
   * during list updates. The tracking function is essential for maintaining component state
   * and preventing unnecessary re-rendering of unchanged items.
   *
   * @param {number} index - The index of the item in the list
   * @param {KeyValue | string | number} item - The item data to track
   * @returns {string | number} A unique identifier for the item
   * @memberOf NgxDecafComponent
   */
  protected trackItemFn(
    index: number,
    item: KeyValue | string | number
  ): string | number {
    return `${index}-${item}`;
  }


	async handleEvent(event: IBaseCustomEvent | ICrudFormEvent | CustomEvent): Promise<void> {
		const log = this.log.for(this.handleEvent);
    let name = "";
    if(event instanceof CustomEvent) {
       if(!event.detail)
        return log.debug(`No handler for event ${name}`);
      name = event.detail?.name;
      event = event.detail;
    }
    const handlers = (event as ICrudFormEvent)?.['handlers'] as Record<string, NgxEventHandler<unknown>> | undefined;
    name = name || (event as IBaseCustomEvent)?.['name'];
    if(handlers && Object.keys(handlers || {})?.length) {
      if(!handlers[name])
        return log.debug(`No handler found for event ${name}`);
      try {
        const clazz = new (handlers as KeyValue)[name](this.router);
        const result = clazz.handle(event);
        return (result instanceof Promise) ?
         await result : result;
      } catch (e: unknown) {
        log.error(`Failed to handle ${name} event`, e as Error)
      }
    }
    this.listenEvent.emit(event as IBaseCustomEvent | ICrudFormEvent);
	}

	// ngOnInit() {
		// this.setColorScheme(MediaService.isDarkMode() ? "dark" : "light");
	// }

	// protected setColorScheme(scheme: "light" | "dark") {}
}
