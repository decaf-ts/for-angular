/**
 * @module module:lib/components/pagination/pagination.component
 * @description Pagination component module.
 * @summary Provides `PaginationComponent` for displaying page navigation controls
 * and emitting pagination events. Use this component to navigate paginated data
 * in lists and other collections.
 *
 * @link {@link PaginationComponent}
 */

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import {  NgxComponentDirective } from '../../engine/NgxComponentDirective';
import { KeyValue } from '../../engine/types';
import { EventConstants } from '../../engine/constants';
import { IPaginationCustomEvent } from '../../engine/interfaces';

/**
 * @description A pagination component for navigating through multiple pages of content.
 * @summary This component provides a user interface for paginated content navigation,
 * displaying page numbers and navigation controls. It supports customizable page counts,
 * current page tracking, and emits events when users navigate between pages.
 *
 * The component intelligently handles large numbers of pages by showing a subset of page
 * numbers with ellipses to indicate skipped pages, ensuring the UI remains clean and usable
 * even with many pages.
 *
 * @mermaid
 * sequenceDiagram
 *   participant U as User
 *   participant P as PaginationComponent
 *   participant E as External Component
 *
 *   U->>P: Click page number
 *   P->>P: navigate(page)
 *   P->>P: handleClick(direction, page)
 *   P->>E: Emit clickEvent with IPaginationCustomEvent
 *
 *   U->>P: Click next button
 *   P->>P: next()
 *   P->>P: handleClick('next')
 *   P->>E: Emit clickEvent with IPaginationCustomEvent
 *
 *   U->>P: Click previous button
 *   P->>P: previous()
 *   P->>P: handleClick('previous')
 *   P->>E: Emit clickEvent with IPaginationCustomEvent
 *
 * @example
 * <ngx-decaf-pagination
 *   [pages]="10"
 *   [current]="3"
 *   (clickEvent)="handlePageChange($event)">
 * </ngx-decaf-pagination>
 *
 * @extends {NgxBaseComponentDirective}
 * @implements {OnInit}
 */
@Component({
  selector: 'ngx-decaf-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  imports: [
    TranslatePipe,
    IonIcon
  ],
  standalone: true,

})
export class PaginationComponent extends NgxComponentDirective implements OnInit {

  /**
   * @description The total number of pages to display in the pagination component.
   * @summary Specifies the total number of pages available for navigation. This is a required
   * input that determines how many page numbers will be generated and displayed.
   *
   * @type {number}
   * @required
   * @memberOf PaginationComponent
   */
  @Input({ required: true })
  totalPages!: number;

  /**
   * @description The currently active page number.
   * @summary Specifies which page is currently active or selected. This value is used
   * to highlight the current page in the UI and as a reference point for navigation.
   *
   * @type {number}
   * @default 1
   * @memberOf PaginationComponent
   */
  @Input()
  current = 1;

  /**
   * @description Array of page objects for rendering in the template.
   * @summary Contains the processed page data used for rendering the pagination UI.
   * Each object includes an index (page number) and text representation.
   *
   * @type {KeyValue[]}
   * @memberOf PaginationComponent
   */
  pages!: KeyValue[];

  /**
   * @description The last page number in the pagination.
   * @summary Stores the number of the last page for boundary checking during navigation.
   *
   * @type {number}
   * @memberOf PaginationComponent
   */
  last!: number;

  /**
   * @description Event emitter for pagination navigation events.
   * @summary Emits a custom event when users navigate between pages, either by clicking
   * on page numbers or using the next/previous buttons. The event contains information
   * about the navigation direction and the target page number.
   *
   * @type {EventEmitter<IPaginationCustomEvent>}
   * @memberOf PaginationComponent
   */
  @Output()
  clickEvent: EventEmitter<IPaginationCustomEvent> = new EventEmitter<IPaginationCustomEvent>();

  /**
   * @constructor
   * @description Initializes a new instance of the PaginationComponent.
   * Calls the parent constructor with the component name for generate base locale string.
   */
  constructor() {
    super("PaginationComponent");
    addIcons({chevronBackOutline, chevronForwardOutline});
  }

  /**
   * @description Initializes the component after Angular sets the input properties.
   * @summary Sets up the component by initializing the locale settings based on the
   * translatable property, generating the page numbers based on the total pages and
   * current page, and storing the last page number for boundary checking.
   *
   * @mermaid
   * sequenceDiagram
   *   participant A as Angular Lifecycle
   *   participant P as PaginationComponent
   *
   *   A->>P: ngOnInit()
   *   P->>P: getLocale(translatable)
   *   P->>P: Set locale
   *   P->>P: getPages(data, current)
   *   P->>P: Set pages array
   *   P->>P: Set last page number
   *
   * @returns {void}
   * @memberOf PaginationComponent
   */
  ngOnInit(): void {
    // this.locale = this.getLocale(this.translatable);
    this.pages = this.getPages(this.totalPages, this.current) as KeyValue[];
    this.last = this.totalPages;
  }

  /**
   * @description Handles click events on pagination controls.
   * @summary Processes user interactions with the pagination component, updating the
   * current page if specified and emitting an event with navigation details. This method
   * is called when users click on page numbers or navigation buttons.
   *
   * @param {('next' | 'previous')} direction - The direction of navigation
   * @param {number} [page] - Optional page number to navigate to directly
   * @returns {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant P as PaginationComponent
   *   participant E as External Component
   *
   *   U->>P: Click pagination control
   *   P->>P: handleClick(direction, page?)
   *   alt page is provided
   *     P->>P: Update current page
   *   end
   *   P->>E: Emit clickEvent with direction and page
   *
   * @memberOf PaginationComponent
   */
  handleClick(direction: 'next' | 'previous', page?: number): void {
    if (page)
      this.current = page;
    this.clickEvent.emit({
      name: EventConstants.CLICK,
      data: {
        direction,
        page: this.current
      },
      component: this.componentName
    } as IPaginationCustomEvent);
  }

  /**
   * @description Generates the array of page objects for display.
   * @summary Creates an array of page objects based on the total number of pages and
   * the current page. For small page counts (≤5), all pages are shown. For larger page
   * counts, a subset is shown with ellipses to indicate skipped pages. This ensures
   * the pagination UI remains clean and usable even with many pages.
   *
   * @param {number} total - The total number of pages
   * @param {number} [current] - The current active page (defaults to this.current)
   * @returns {KeyValue[]} Array of page objects with index and text properties
   *
   * @mermaid
   * flowchart TD
   *   A[Start] --> B{total <= 5?}
   *   B -->|Yes| C[Show all pages]
   *   B -->|No| D[Show first page]
   *   D --> E[Show last pages]
   *   E --> F[Add ellipses for skipped pages]
   *   C --> G[Return pages array]
   *   F --> G
   *
   * @memberOf PaginationComponent
   */
  getPages(total: number, current?: number): KeyValue[] {
    if (!current) current = this.current;

    const pages: KeyValue[] = [];

    function getPage(index: number | null, text = '', clazz = 'button'): void {
        if (pages.some(item => item['index'] === index)) return;
        pages.push({ index, text: index != null ? index.toString().padStart(2, '0') : text, class: clazz });
    }

    if (total <= 5) {
        for (let i = 1; i <= total; i++) getPage(i);
    } else {
      // Adiciona os dois primeiros
      getPage(1);
      getPage(2);

      // Adiciona "..." entre os blocos
      if (current && current > 3) getPage(null, '...');

      // Adiciona a página atual (se estiver no meio)
      if (current && current > 2 && current < total - 1) getPage(current);

      // Adiciona "..." entre os blocos
      if (current && current < total - 2) getPage(null, '...' , 'separator');

      // Adiciona os dois últimos
      getPage(total - 1);
      getPage(total);
    }

    return pages;
  }

  /**
   * @description Gets the current active page number.
   * @summary Returns the current page number that is active in the pagination component.
   * This method provides a way to access the current page state from outside the component.
   *
   * @returns {number} The current page number
   * @memberOf PaginationComponent
   */
  getCurrent(): number {
    return this.current;
  }

  /**
   * @description Navigates to the next page.
   * @summary Increments the current page number if not at the last page and triggers
   * the click event handler with 'next' direction. This method is typically called
   * when the user clicks on the "next" button in the pagination UI.
   *
   * @returns {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant P as PaginationComponent
   *
   *   U->>P: Click next button
   *   P->>P: next()
   *   alt page <= max pages
   *     P->>P: Increment current page
   *     P->>P: handleClick('next')
   *   end
   *
   * @memberOf PaginationComponent
   */
  next(): void {
    const page = this.current + 1;
    if (page <= Object.keys(this.pages)?.length || 0) {
      this.current = page;
      this.handleClick('next');
    }
  }

  /**
   * @description Navigates to the previous page.
   * @summary Decrements the current page number if not at the first page and triggers
   * the click event handler with 'previous' direction. This method is typically called
   * when the user clicks on the "previous" button in the pagination UI.
   *
   * @returns {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant P as PaginationComponent
   *
   *   U->>P: Click previous button
   *   P->>P: previous()
   *   alt page > 0
   *     P->>P: Decrement current page
   *     P->>P: handleClick('previous')
   *   end
   *
   * @memberOf PaginationComponent
   */
  previous(): void {
    const page = this.current - 1;
    if (page > 0) {
      this.current = page;
      this.handleClick('previous');
    }
  }

  /**
   * @description Navigates to a specific page number.
   * @summary Updates the current page to the specified page number and triggers
   * the click event handler with the appropriate direction. This method is typically
   * called when the user clicks directly on a page number in the pagination UI.
   *
   * @param {number | null} page - The page number to navigate to
   * @returns {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant P as PaginationComponent
   *
   *   U->>P: Click page number
   *   P->>P: navigate(page)
   *   alt page is not null and different from current
   *     P->>P: Determine direction (next/previous)
   *     P->>P: handleClick(direction, page)
   *   end
   *
   * @memberOf PaginationComponent
   */
  navigate(page: number | null): void {
    if (page !== null && this.current !== page as number)
      this.handleClick(page > this.current ? 'next' : 'previous', page);
  }
}
