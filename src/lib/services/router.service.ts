import { inject, Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { NavigationOptions } from '@ionic/angular/common/providers/nav-controller';
import { throwError } from '../helpers/logging';
import { KeyValue } from '../engine/types';
import { EventConstants, RouteDirections } from '../engine/constants';
import { getOnWindow, windowEventEmitter } from '../helpers/utils';
import { Primitives } from '@decaf-ts/decorator-validation/dist/types/model/constants';


@Injectable({
  providedIn: 'root'
})
export class RouterService {

  /**
   * @private
   *
   * @type {(string)}
   * @memberof RouterService
   */
  private previousUrl!: string;

  private router: Router = inject(Router);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private navController: NavController = inject(NavController);
  private location: Location = inject(Location);

  constructor() {
  //  injectableRegistry.register(this, "RouterService");
  }


 /**
  * Parses query parameters from the current route and returns them as an array of key-value pairs.
  *
  * @param params - A string or array of strings representing the query parameter names to parse.
  *                 If a single string is provided, it will be converted to an array.
  *
  * @returns An array of KeyValue objects, where each object represents a query parameter.
  *          The key is the parameter name, and the value is the parameter value from the route.
  *          If a parameter is not found in the route, its value will be null.
  */
  parseAllQueryParams(params: string | string[]): KeyValue[] {
    if(typeof params === Primitives.STRING)
      params = [params as string];
    return (params as string[]).reduce((acc: KeyValue[], param: string) => {
      const item = {[param]: (this.route.snapshot.queryParamMap.get(param) as string) || null};
      return [...acc, item];
    }, []);
  }


 /**
  * Checks if a specific query parameter exists in the current route.
  *
  * @param param - The name of the query parameter to check for.
  * @returns A boolean indicating whether the specified query parameter exists (true) or not (false).
  */
  hasQueryParam(param: string): boolean {
    return this.route.snapshot.queryParams.hasOwnProperty(param)
  }


 /**
  * Retrieves a specific query parameter from the current route.
  *
  * @param param - The name of the query parameter to retrieve.
  * @returns A KeyValue object containing the parameter name and its value,
  *          or undefined if the parameter is not found in the route.
  */
  getQueryParam(param: string): KeyValue | undefined {
    return this.parseAllQueryParams(param)?.[0] || undefined;
  }

  /**
   * Retrieves the value of a specific query parameter from the current route.
   *
   * @param param - The name of the query parameter to retrieve.
   * @returns The value of the specified query parameter as a string, or undefined if the parameter is not found.
   */
  getQueryParamValue(param: string): string | undefined {
    return this.parseAllQueryParams(param)?.[0]?.[param] || undefined;
  }


  /**
   * Retrieves the last segment of the current URL.
   *
   * This function extracts the last part of the URL path, which is typically
   * the current page or resource identifier. It first attempts to use the Angular
   * Router's URL, and if that's not available, falls back to the global window's
   * location href.
   *
   * @returns {string} The last segment of the current URL path. If the URL has no
   *                   segments (e.g., the root URL '/'), it may return an empty string.
   */
  getLastUrlSegment(): string {
    return (this.router.url || globalThis.window.location.href).split('/').pop() as string;
  }


 /**
  * Retrieves the current URL of the application.
  *
  * This function extracts the current URL from the Angular Router's `url` property or the `window.location.pathname` property.
  * It then replaces the leading forward slash ('/') with an empty string to obtain the clean URL.
  *
  * @returns {string} The current URL of the application, without the leading forward slash.
  */
  getCurrentUrl(): string {
    const routerUrl = this.router.url;
    const pathName  = getOnWindow('location').pathname;
    return ((routerUrl === '/' && routerUrl !== pathName) ? pathName : routerUrl).replace('/', '');
  }

 /**
  * Retrieves the URL of the previous page in the browser's history.
  *
  * This method uses the Angular Router's `getCurrentNavigation()` method to retrieve the current navigation
  * and then extracts the URL of the previous page from the `previousNavigation` property.
  *
  * @returns {string} The URL of the previous page.
  */
  getPreviousUrl(): string {
    const currentNavigation = this.router.getCurrentNavigation();
    if (!!currentNavigation && currentNavigation.previousNavigation?.finalUrl?.toString() !== undefined)
      this.previousUrl = currentNavigation.previousNavigation?.finalUrl?.toString();

    return this.previousUrl as string;
  }


 /**
  * Navigates back to the previous page using the Angular Location service.
  *
  * This method is a wrapper around the `back()` method of the Angular Location service.
  * It allows the application to navigate back to the previous page in the browser's history.
  *
  * @returns {void}
  */
  backToLastPage(): void {
    windowEventEmitter(EventConstants.BACK_BUTTON_NAVIGATION, {refresh: true});
    return this.location.back();
  }

 /**
  * Navigates to a specified page using the Ionic NavController.
  *
  * @param page - The page to navigate to.
  * @param direction - The direction of navigation (default is forward).
  * @param options - Additional navigation options.
  *
  * @returns A promise that resolves to true if navigation is successful, otherwise false.
  */
 navigateTo(page: string, direction: RouteDirections = RouteDirections.FORWARD, options?: NavigationOptions): Promise<boolean> {

  if(direction === RouteDirections.ROOT)
    return this.navController.navigateRoot(page, options);

  if(direction === RouteDirections.FORWARD)
    return this.navController.navigateForward(page, options);

  return this.navController.navigateBack(page, options);

 }

 /**
  * Throws an error with a custom message and logs the error details.
  *
  * This function is used to handle and log errors within the application. It takes an `Error` object as a parameter,
  * extracts the error message, and then calls the `throwError` function from the `logging` utility.
  *
  * @param err - The `Error` object containing the error details.
  *
  * @returns {void} - The function does not return a value.
  *
  * @throws {Error} - Throws the error with a custom message.
  */
  throwError(err: Error): void {
    throwError(this, err.message ? err.message : JSON.stringify(err));
  }

}
