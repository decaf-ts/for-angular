import { inject, Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { NavigationOptions } from '@ionic/angular/common/providers/nav-controller';
import { throwError } from '../../lib/helpers/logging';
import { KeyValue } from '../../lib/engine/types';
import { EventConstants, RouteDirections } from '../../lib/engine/constants';
import { getOnWindow, windowEventEmitter } from '../../lib/helpers/utils';
import { Primitives } from '@decaf-ts/decorator-validation';

/**
 * @description Service for handling routing operations in the application.
 * @summary The RouterService provides a unified interface for navigation and route management,
 * abstracting the underlying Angular Router and Ionic NavController functionality. It offers
 * methods for navigating between routes, retrieving URL information, and managing query parameters.
 * This service is designed to simplify navigation patterns and provide consistent behavior
 * across the application.
 *
 * @class RouterService
 * @injectable
 */
@Injectable({
  providedIn: 'root',
})
export class RouterService {
  /**
   * @description Stores the previous URL for back navigation.
   * @summary Caches the previous URL from the router navigation events.
   * This is used as a reference point for back navigation and for determining
   * the navigation history of the application.
   *
   * @private
   * @type {string}
   * @memberOf RouterService
   */
  private previousUrl!: string;

  /**
   * @description Angular Router service.
   * @summary Injected Angular Router service that provides core navigation capabilities,
   * URL manipulation, and navigation event handling. This service is used for most
   * routing operations and for accessing information about the current route.
   *
   * @private
   * @type {Router}
   * @memberOf RouterService
   */
  private router: Router = inject(Router);

  /**
   * @description Angular ActivatedRoute service.
   * @summary Injected service that provides access to information about a route
   * associated with a component loaded in an outlet. This service is used to
   * access route parameters, query parameters, and other route-specific data.
   *
   * @private
   * @type {ActivatedRoute}
   * @memberOf RouterService
   */
  private route: ActivatedRoute = inject(ActivatedRoute);

  /**
   * @description Ionic NavController service.
   * @summary Injected Ionic service that provides methods for navigating between pages
   * with animated transitions. This service extends Angular's routing capabilities
   * with mobile-friendly navigation patterns and animations.
   *
   * @private
   * @type {NavController}
   * @memberOf RouterService
   */
  private navController: NavController = inject(NavController);

  /**
   * @description Angular Location service.
   * @summary Injected service that provides access to the browser's URL and history.
   * This service is used for interacting with the browser's history API, allowing
   * for back navigation and URL manipulation outside of Angular's router.
   *
   * @private
   * @type {Location}
   * @memberOf RouterService
   */
  private location: Location = inject(Location);

  /**
   * @description Creates an instance of RouterService.
   * @summary Initializes a new RouterService. The commented line suggests that in a previous
   * version, this service was registered with an injectable registry system, which may have
   * been used for dependency tracking or service discovery.
   *
   * @memberOf RouterService
   */
  constructor() {
    //  injectableRegistry.register(this, &quot;RouterService&quot;);
  }

  /**
   * @description Parses query parameters from the current route.
   * @summary Extracts specified query parameters from the current route and returns them
   * as an array of key-value pairs. This method supports both single parameter and
   * multiple parameter extraction, making it flexible for various use cases.
   *
   * @param {string | string[]} params - The parameter name(s) to extract from the route
   * @return {KeyValue[]} An array of key-value objects representing the extracted parameters
   *
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant R as RouterService
   *   participant A as ActivatedRoute
   *
   *   C->>R: parseAllQueryParams(params)
   *   alt params is string
   *     R->>R: Convert params to array
   *   end
   *   R->>R: Initialize empty result array
   *   loop For each param in params
   *     R->>A: Get param value from queryParamMap
   *     A-->>R: Return param value or null
   *     R->>R: Create key-value object
   *     R->>R: Add to result array
   *   end
   *   R-->>C: Return array of key-value pairs
   *
   * @memberOf RouterService
   */
  parseAllQueryParams(params: string | string[]): KeyValue[] {
    if (typeof params === Primitives.STRING) params = [params as string];
    return (params as string[]).reduce((acc: KeyValue[], param: string) => {
      const item = {
        [param]:
          (this.route.snapshot.queryParamMap.get(param) as string) || null,
      };
      return [...acc, item];
    }, []);
  }

  /**
   * @description Checks if a query parameter exists in the current route.
   * @summary Determines whether a specific query parameter is present in the current route's
   * query parameters. This is useful for conditional logic based on the presence of
   * certain parameters in the URL.
   *
   * @param {string} param - The name of the query parameter to check
   * @return {boolean} True if the parameter exists, false otherwise
   *
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant R as RouterService
   *   participant A as ActivatedRoute
   *
   *   C->>R: hasQueryParam(param)
   *   R->>A: Access snapshot.queryParams
   *   R->>R: Check if param exists in queryParams
   *   R-->>C: Return boolean result
   *
   * @memberOf RouterService
   */
  hasQueryParam(param: string): boolean {
    return this.route.snapshot.queryParams.hasOwnProperty(param);
  }

  /**
   * @description Retrieves a specific query parameter from the current route.
   * @summary Extracts a single query parameter from the current route and returns it
   * as a key-value pair. This method leverages parseAllQueryParams internally and
   * returns the first result or undefined if the parameter doesn't exist.
   *
   * @param {string} param - The name of the query parameter to retrieve
   * @return {KeyValue | undefined} A key-value object representing the parameter, or undefined if not found
   *
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant R as RouterService
   *
   *   C->>R: getQueryParam(param)
   *   R->>R: parseAllQueryParams(param)
   *   R->>R: Extract first result or undefined
   *   R-->>C: Return key-value object or undefined
   *
   * @memberOf RouterService
   */
  getQueryParam(param: string): KeyValue | undefined {
    return this.parseAllQueryParams(param)?.[0] || undefined;
  }

  /**
   * @description Retrieves the value of a specific query parameter.
   * @summary Extracts the value of a single query parameter from the current route.
   * This is a convenience method that handles the extraction and returns just the
   * value rather than a key-value pair.
   *
   * @param {string} param - The name of the query parameter to retrieve
   * @return {string | undefined} The value of the parameter, or undefined if not found
   *
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant R as RouterService
   *
   *   C->>R: getQueryParamValue(param)
   *   R->>R: parseAllQueryParams(param)
   *   R->>R: Extract value from first result or undefined
   *   R-->>C: Return string value or undefined
   *
   * @memberOf RouterService
   */
  getQueryParamValue(param: string): string | undefined {
    return (
      (this.parseAllQueryParams(param)?.[0]?.[param] as string) || undefined
    );
  }

  /**
   * @description Retrieves the last segment of the current URL.
   * @summary Extracts the final path segment from the current URL, which often
   * represents the current page or resource identifier. This method first attempts
   * to use the Angular Router's URL, and falls back to the window location if needed.
   *
   * @return {string} The last segment of the current URL path
   *
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant R as RouterService
   *   participant W as Window
   *
   *   C->>R: getLastUrlSegment()
   *   alt Router URL available
   *     R->>R: Split router.url by &#39;/&#39;
   *   else Router URL not available
   *     R->>W: Get window.location.href
   *     R->>R: Split href by &#39;/&#39;
   *   end
   *   R->>R: Extract last segment
   *   R-->>C: Return last segment
   *
   * @memberOf RouterService
   */
  getLastUrlSegment(): string {
    return (this.router.url || globalThis.window.location.href)
      .split('/')
      .pop() as string;
  }

  /**
   * @description Retrieves the current URL of the application.
   * @summary Extracts the current URL path from either the Angular Router or the browser's
   * window location, depending on availability. It also cleans the URL by removing the
   * leading forward slash for consistency.
   *
   * @return {string} The current URL of the application without the leading slash
   *
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant R as RouterService
   *   participant W as Window
   *
   *   C->>R: getCurrentUrl()
   *   R->>R: Get router.url
   *   R->>W: Get window.location.pathname
   *   alt router.url is &#39;/&#39; and different from pathname
   *     R->>R: Use pathname
   *   else
   *     R->>R: Use router.url
   *   end
   *   R->>R: Remove leading &#39;/&#39;
   *   R-->>C: Return clean URL
   *
   * @memberOf RouterService
   */
  getCurrentUrl(): string {
    const routerUrl = this.router.url;
    const pathName = globalThis.window?.location?.pathname;
    const result =
      routerUrl === '/' && routerUrl !== pathName ? pathName : routerUrl;
    return result.replace('/', '');
  }

  /**
   * @description Retrieves the URL of the previous page.
   * @summary Extracts the URL of the previous page from the router's navigation history.
   * This information is useful for back navigation and for understanding the user's
   * navigation path through the application.
   *
   * @return {string} The URL of the previous page
   *
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant R as RouterService
   *   participant N as Router Navigation
   *
   *   C->>R: getPreviousUrl()
   *   R->>N: Get currentNavigation
   *   alt previousNavigation exists
   *     R->>N: Extract previousNavigation.finalUrl
   *     R->>R: Store in previousUrl
   *   end
   *   R-->>C: Return previousUrl
   *
   * @memberOf RouterService
   */
  getPreviousUrl(): string {
    const currentNavigation = this.router.getCurrentNavigation();
    if (
      !!currentNavigation &&
      currentNavigation.previousNavigation?.finalUrl?.toString() !== undefined
    )
      this.previousUrl =
        currentNavigation.previousNavigation?.finalUrl?.toString();
    return this.previousUrl as string;
  }

  /**
   * @description Navigates back to the previous page.
   * @summary Triggers navigation back to the previous page in the browser's history.
   * This method also dispatches a custom event to notify other components about
   * the back navigation.
   *
   * @return {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant R as RouterService
   *   participant L as Location
   *
   *   C->>R: backToLastPage()
   *   R->>L: Dispatch BACK_BUTTON_NAVIGATION event
   *   R->>L: Navigate back
   *
   * @memberOf RouterService
   */
  backToLastPage(): void {
    globalThis.window.dispatchEvent(
      new CustomEvent(EventConstants.BACK_BUTTON_NAVIGATION, {
        bubbles: true,
        composed: true,
        cancelable: false,
        detail: { refres: true },
      })
    );
    this.location.back();
  }

  /**
   * @description Navigates to a specified page.
   * @summary Triggers navigation to a specified page using the Ionic NavController.
   * Supports different navigation directions and additional options.
   *
   * @param {string} page - The page to navigate to
   * @param {RouteDirections} [direction=RouteDirections.FORWARD] - The direction of navigation
   * @param {NavigationOptions} [options] - Additional navigation options
   * @return {Promise<boolean>} A promise that resolves to true if navigation is successful, otherwise false
   *
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant R as RouterService
   *   participant N as NavController
   *
   *   C->>R: navigateTo(page, direction, options)
   *   alt direction is ROOT
   *     R->>N: navigateRoot(page, options)
   *   else direction is FORWARD
   *     R->>N: navigateForward(page, options)
   *   else direction is BACK
   *     R->>N: navigateBack(page, options)
   *   end
   *   N-->>R: Return navigation result
   *   R-->>C: Return boolean result
   *
   * @memberOf RouterService
   */
  async navigateTo(
    page: string,
    direction: RouteDirections = RouteDirections.FORWARD,
    options?: NavigationOptions
  ): Promise<boolean> {
    if (direction === RouteDirections.ROOT)
      return this.navController.navigateRoot(page, options);
    if (direction === RouteDirections.FORWARD)
      return await this.navController.navigateForward(page, options);
    return await this.navController.navigateBack(page, options);
  }
}
