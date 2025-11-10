/**
 * @module lib/engine/NgxPageDirective
 * @description Base page component for Decaf Angular applications.
 * @summary Provides a page-level base class (NgxPageDirective) that extends NgxComponentDirective and
 * offers page-focused utilities such as menu management, title handling and router event hooks.
 * @link {@link NgxPageDirective}
 */
import { AfterViewInit, Directive, Inject, inject, OnInit } from "@angular/core";
import { NgxComponentDirective} from "./NgxComponentDirective";
import { Title } from "@angular/platform-browser";
import { IMenuItem } from "./interfaces";
import { CPTKN } from "../for-angular-common.module";
import { NavigationEnd, NavigationStart } from "@angular/router";
import { removeFocusTrap } from "../utils/helpers";
import { KeyValue } from "./types";
import { MenuController } from "@ionic/angular";


/**
 * @description Base directive for page-level components in Decaf Angular applications.
 * @summary Abstract directive that provides foundational functionality for page components.
 * Extends NgxComponentDirective to add page-specific features including menu management,
 * page title handling, and Ionic lifecycle hooks. This directive serves as the base class for
 * all page-level components, providing consistent behavior for navigation, routing, and UI state.
 * @class NgxPageDirective
 * @extends {NgxComponentDirective}
 * @memberOf module:lib/engine/NgxPageDirective
 */
@Directive()
export abstract class NgxPageDirective extends NgxComponentDirective implements OnInit, AfterViewInit {


  /**
   * @description Page title text for the current view.
   * @summary Stores the title text to be displayed for this page. This can be set dynamically
   * based on the current route or menu configuration and is used to update the browser's
   * title bar or page header.
   * @type {string}
   * @default ''
   * @memberOf module:lib/engine/NgxPageDirective
   */
  title: string = '';


  /**
   * @description Global key-value pairs for application-wide settings.
   * @summary This property stores global configuration values that can be accessed
   * throughout the application. It is typically used to manage shared state or
   * settings that are relevant across multiple components or services.
   * @type {KeyValue}
   * @memberOf module:lib/engine/NgxPageDirective
   */
  globals!: KeyValue;


  /**
   * @description Ionic menu controller service for menu management.
   * @summary Injected service that provides programmatic control over Ionic menu components.
   * This service allows the component to open, close, toggle, and manage menu states within
   * the application. It provides access to menu functionality for implementing navigation
   * and layout features that require menu interaction.
   * @protected
   * @type {MenuController}
   * @memberOf module:lib/engine/NgxPageDirective
   */
  protected menuController: MenuController = inject(MenuController);


  /**
   * @description Menu items array for page navigation.
   * @summary Contains the collection of menu items available for this page. Each menu item
   * defines a navigation option with properties like label, URL, icon, and visibility settings.
   * This array is used to construct the application's navigation menu and can be filtered or
   * customized per page.
   * @protected
   * @type {IMenuItem[]}
   * @default []
   * @memberOf module:lib/engine/NgxPageDirective
   */
  protected menu: IMenuItem[] = [];

  /**
   * @description Angular Title service for browser title management.
   * @summary Injected service that provides control over the browser's document title.
   * Used to dynamically set the page title based on the current route or active menu item,
   * improving SEO and user experience.
   * @protected
   * @type {Title}
   * @memberOf module:lib/engine/NgxPageDirective
   */
  protected titleService: Title = inject(Title);


  /**
   * @description Flag indicating whether the page should display the navigation menu.
   * @summary Controls the visibility and availability of the application menu for this page.
   * When set to true, the menu is enabled and accessible to users. When false, the menu
   * is disabled, which is useful for pages like login screens or standalone views that
   * should not show navigation options.
   * @protected
   * @type {boolean}
   * @default true
   * @memberOf module:lib/engine/NgxPageDirective
   */
  protected hasMenu: boolean = true;


  /**
   * @description Currently active route path for the page (without leading slash).
   * @summary This protected property stores the current route segment used by the
   * page to determine the displayed title and menu state. It is updated on
   * NavigationEnd events (see ngAfterViewInit) and consumed by the `pageTitle`
   * getter and `setPageTitle()` method. When undefined the component will
   * attempt to resolve the route from the router URL.
   * @protected
   * @type {string | undefined}
   * @default undefined
   */
  protected currentRoute?: string;

  /**
   * @description Constructor for NgxPageDirective.
   * @summary Initializes the page directive with optional locale root and menu visibility settings.
   * Calls the parent NgxComponentDirective constructor to set up base functionality including
   * logging, localization, and component identification.
   * @param {string} [localeRoot] - Optional locale root key for internationalization
   * @param {boolean} [hasMenu=true] - Whether this page should display the menu
   * @memberOf module:lib/engine/NgxPageDirective
   */
  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(@Inject(CPTKN) localeRoot: string = "NgxPageDirective", @Inject(CPTKN) hasMenu: boolean = true) {
    super(localeRoot);
    this.hasMenu = hasMenu;
    // subscribe to media service color scheme changes
    this.mediaService.colorScheme$.subscribe();
  }

  get pageTitle(): string {
    if(this.title)
      return this.title;
    if(this.locale)
      return `${this.locale}.title`;
    if(this.currentRoute)
      return this.currentRoute?.charAt(0).toUpperCase() + this.currentRoute?.slice(1) || 'Decaf For Angular';
    return "";
  }

  ngOnInit(): Promise<void> | void{
    // connect component to media service for color scheme toggling
    this.mediaService.colorSchemeObserver(this.component);
    this.currentRoute = this.router.url.replace('/', '');
    this.setPageTitle(this.currentRoute);
    this.initialized = true;
  }

  /**
   * @description Ionic lifecycle hook called when the page is about to enter view.
   * @summary This lifecycle hook is triggered just before the page becomes visible to the user.
   * It enables or disables the application menu based on the hasMenu property, allowing pages
   * to control whether the menu should be accessible. This is useful for pages like login screens
   * where the menu should be hidden.
   * @return {Promise<void>} A promise that resolves when menu state is updated
   * @memberOf module:lib/engine/NgxPageDirective
   */
	async ngAfterViewInit(): Promise<void> {
    this.router.events.subscribe(async event => {
      if(event instanceof NavigationEnd) {
        const url = (event?.url || "").replace('/', '');
        this.hasMenu = url !== "login" && url !== "";
        this.currentRoute = url;
        this.setPageTitle(this.currentRoute);
        this.title = this.pageTitle;
      }
      if (event instanceof NavigationStart)
        removeFocusTrap();
    });
    await this.menuController.enable(this.hasMenu);
	}



  /**
   * @description Sets the browser page title based on the current route.
   * @summary Updates the browser's document title by finding the active menu item that matches
   * the provided route. If a matching menu item is found, it sets the title using the format
   * "Decaf For Angular - {menu title or label}". This improves SEO and provides clear context
   * to users about the current page. If a custom menu array is provided, it uses that instead
   * of the component's default menu.
   * @protected
   * @param {string} route - The current route path to match against menu items
   * @param {IMenuItem[]} [menu] - Optional custom menu array to search (uses this.menu if not provided)
   * @return {void}
   * @memberOf module:lib/engine/NgxPageDirective
   */
  protected setPageTitle(route?: string, menu?: IMenuItem[]): void {
    if(!route)
      route = this.router.url.replace('/', '');
    if(!menu)
      menu = this.menu;
    const activeMenu = menu.find(item => item?.url?.includes(route));
    if(activeMenu) {
      const title = activeMenu?.title || activeMenu?.label;
      this.titleService.setTitle(`${title}`);
      if(!this.title)
        this.title = title;
    }
  }

}
