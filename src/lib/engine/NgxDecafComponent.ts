import { Directive, EventEmitter, inject, Output } from '@angular/core';
import { LoggedClass, Logger } from '@decaf-ts/logging';
import { KeyValue } from './types';
import { IBaseCustomEvent, ICrudFormEvent } from '../engine/interfaces';
import { NgxEventHandler } from './NgxEventHandler';
import { Router } from '@angular/router';

@Directive()
export abstract class NgxDecafComponent extends LoggedClass {

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
   * @memberOf LoginPage
   */
  protected router: Router = inject(Router);

  locale?: string;

  constructor() {
		super();
    this.logger = this.log;
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
    if(handlers) {
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
