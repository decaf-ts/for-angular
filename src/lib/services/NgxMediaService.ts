/**
 * @module NgxMediaService
 * @description Provides utilities for managing media-related features such as color scheme detection,
 * window resize observation, and SVG injection.
 * @summary
 * This module exposes the `NgxMediaService` class, which includes methods for observing the
 * application's color scheme, handling window resize events, and dynamically injecting SVG content
 * into the DOM. It leverages Angular's dependency injection system and RxJS for reactive programming.
 *
 * Key exports:
 * - {@link NgxMediaService}: The main service class providing media-related utilities.
 */

import { ElementRef, Injectable, NgZone,  inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fromEvent, Subject, Observable, BehaviorSubject, merge, of, timer } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, takeUntil, tap,  switchMap } from 'rxjs/operators';
import { IWindowResizeEvent } from '../engine/interfaces';
import { WindowColorScheme } from '../engine/types';
import { getWindow, getWindowDocument } from '../utils/helpers';
import { AngularEngineKeys, WindowColorSchemes } from '../engine/constants';




/**
 * @description Service for managing media-related features in an Angular application.
 * @summary
 * The `NgxMediaService` provides utilities for observing and managing media-related features
 * such as color scheme detection, window resize events, and dynamic SVG injection. It leverages
 * Angular's dependency injection system and RxJS for reactive programming.
 *
 * @class NgxMediaService
 * @example
 * // Inject the service into a component
 * constructor(private mediaService: NgxMediaService) {}
 *
 * // Observe the current color scheme
 * this.mediaService.colorScheme$.subscribe(scheme => {
 *   console.log('Current color scheme:', scheme);
 * });
 *
 * // Observe window resize events
 * this.mediaService.resize$.subscribe(dimensions => {
 *   console.log('Window dimensions:', dimensions);
 * });
 */
@Injectable({
  providedIn: 'root',
})
export class NgxMediaService {

  /**
   * @description Subject used to signal the destruction of the service.
   * @summary
   * This subject is used to complete observables and clean up resources when the service is destroyed.
   * It is utilized with the `takeUntil` operator to manage subscriptions.
   */
  private readonly destroy$ = new Subject<void>();

  /**
   * @description BehaviorSubject to track the window's dimensions.
   * @summary
   * This subject holds the current dimensions of the window (width and height) and emits updates
   * whenever the window is resized. It is used to provide the `resize$` observable.
   */
  private resizeSubject = new BehaviorSubject<IWindowResizeEvent>({
    width: this._window.innerWidth,
    height: this._window.innerHeight
  });

  /**
   * @description Angular's NgZone service for running code outside Angular's zone.
   * @summary
   * This service is used to optimize performance by running certain operations outside
   * Angular's zone and bringing updates back into the zone when necessary.
   */
  private readonly angularZone: NgZone = inject(NgZone);

  /**
   * @description Angular's HttpClient service for making HTTP requests.
   * @summary
   * This service is used to fetch resources such as SVG files for injection into the DOM.
   */
  // private http = inject(HttpClient);

  /**
   * @description Tracks the current color scheme of the application.
   * @summary
   * This property holds the current color scheme (light, dark, or undefined) and is updated
   * whenever the color scheme changes.
   */
  private currentSchema: WindowColorScheme = WindowColorSchemes.undefined;

  /**
   * @description Observable that emits the current color scheme of the application.
   * @summary
   * This observable emits the current color scheme (light or dark) and updates whenever
   * the system's color scheme preference changes or the `DARK_PALETTE_CLASS` is toggled.
   */
  readonly colorScheme$: Observable<WindowColorScheme> = this.colorSchemeObserver();

  /**
   * @description Observable that emits the current dimensions of the window.
   * @summary
   * This observable emits the current dimensions of the window (width and height) and updates
   * whenever the window is resized.
   */
  readonly resize$: Observable<IWindowResizeEvent> = this.resizeSubject.asObservable();

  /**
   * @description Retrieves the global `window` object.
   * @summary
   * This getter provides access to the global `window` object, ensuring it is properly typed.
   *
   * @return {Window} The global `window` object.
   */
  private get _window(): Window {
    return getWindow() as Window;
  }

  /**
   * @description Retrieves the global `document` object.
   * @summary
   * This getter provides access to the global `document` object, ensuring it is properly typed.
   *
   * @return {Document} The global `document` object.
   */
  private get _document(): Document {
    return getWindowDocument() as Document;
  }


  darkModeEnabled(): boolean {
    return this._document.documentElement.classList.contains('has-dark-mode');;
  }

  /**
   * @description Observes window resize events and emits the updated dimensions.
   * @summary
   * This method listens for window resize events and emits the new dimensions
   * (width and height) through the `resize$` observable. The resize events are
   * processed outside Angular's zone to improve performance, and updates are
   * brought back into the Angular zone to ensure change detection.
   *
   * @return {Observable<IWindowResizeEvent>} An observable that emits the window dimensions on resize.
   * @function windowResizeObserver
   * @example
   * mediaService.windowResizeObserver().subscribe(dimensions => {
   *   console.log('Window dimensions:', dimensions);
   * });
   */
  windowResizeObserver(): Observable<IWindowResizeEvent> {
    const win = this._window;
    this.angularZone.runOutsideAngular(() => {
      fromEvent(win, 'resize')
        .pipe(
          distinctUntilChanged(),
          takeUntil(this.destroy$),
          shareReplay(1)
        )
        .subscribe(() => {
          const dimensions: IWindowResizeEvent = {
            width: win.innerWidth,
            height: win.innerHeight
          };
          // update within the zone to reflect in Angular
          this.angularZone.run(() => this.resizeSubject.next(dimensions));
        });
    });

    return this.resize$;
  }

  /**
   * @description Observes the color scheme of the application.
   * @summary
   * This method observes changes in the system's color scheme preference (light or dark)
   * and the presence of the `DARK_PALETTE_CLASS` on the document's root element.
   * Optionally, it can toggle the dark mode class on a specific component.
   *
   * @param {ElementRef | HTMLElement} [component] - Optional component to toggle the dark mode class on.
   * @return {Observable<WindowColorScheme>} An observable that emits the current color scheme (`dark` or `light`).
   * @function colorSchemeObserver
   * @example
   * // Observe the color scheme globally
   * mediaService.colorSchemeObserver().subscribe(scheme => {
   *   console.log('Current color scheme:', scheme);
   * });
   *
   * // Observe and toggle dark mode on a specific component
   * const component = document.querySelector('.my-component');
   * mediaService.colorSchemeObserver(component).subscribe();
   */
  colorSchemeObserver(component?: ElementRef | HTMLElement): Observable<WindowColorScheme> {
    if(!this.darkModeEnabled())
      return of(WindowColorSchemes.light);
    const win = this._window;
    const doc = this._document;
    const documentElement = doc.documentElement;
    const mediaFn =  win.matchMedia(`(prefers-color-scheme: ${WindowColorSchemes.dark})`);

    if(component) {
      this.colorScheme$.subscribe((schema: WindowColorScheme) => {
        this.toggleClass(
          component,
          AngularEngineKeys.DARK_PALETTE_CLASS,
          schema === WindowColorSchemes.dark ? true : false
        );
      });
    }

    return merge(
      of(mediaFn.matches ? WindowColorSchemes.dark: WindowColorSchemes.light),
      // observe media query changes
      new Observable<WindowColorScheme>(observer => {
        this.angularZone.runOutsideAngular(() => {
          const mediaQuery = mediaFn;
          const subscription = fromEvent<MediaQueryListEvent>(mediaQuery, 'change')
            .pipe(map(event => (event.matches ? WindowColorSchemes.dark: WindowColorSchemes.light)))
            .subscribe(value => {
              this.angularZone.run(() => observer.next(value));
            });
          return () => subscription.unsubscribe();
        });
      }),
      // observe ngx-dcf-palettedark class changes
      new Observable<WindowColorScheme>(observer => {
        this.angularZone.runOutsideAngular(() => {
          const observerConfig = { attributes: true, attributeFilter: ['class'] };
          const mutationObserver = new MutationObserver(() => {
            const theme = documentElement.classList.contains(AngularEngineKeys.DARK_PALETTE_CLASS) ?
              WindowColorSchemes.dark: WindowColorSchemes.light;
               this.angularZone.run(() => observer.next(theme));
          });
          mutationObserver.observe(documentElement, observerConfig);
          // this.angularZone.run(() => observer.next(theme));

          // this.angularZone.run(() => observer.next(theme));
          return () => mutationObserver.disconnect();
        });
      })
    ).pipe(
       distinctUntilChanged(),
       tap(scheme => {
        const shouldAdd = scheme === WindowColorSchemes.dark;
        if (shouldAdd) {
          // always add when the emitted scheme is dark
          this.toggleClass(documentElement, AngularEngineKeys.DARK_PALETTE_CLASS, true);
        } else {
          // remove the class only if the previously stored schema was dark
          if (this.currentSchema === WindowColorSchemes.dark) {
            this.toggleClass(documentElement, AngularEngineKeys.DARK_PALETTE_CLASS, false);
          }
        }
        // store the latest schema value
        this.currentSchema = scheme;
      }),
      takeUntil(this.destroy$),
      shareReplay(1)
    );
  }

  /**
   * @description Observes the scroll state of the active page.
   * @summary
   * This method observes the scroll position of the active page's content and emits a boolean
   * indicating whether the scroll position exceeds the specified offset. It waits for a delay
   * before starting the observation to allow page transitions to complete.
   *
   * @param {number} offset - The scroll offset to compare against.
   * @param {number} [awaitDelay=500] - The delay in milliseconds before starting the observation.
   * @return {Observable<boolean>} An observable that emits `true` if the scroll position exceeds the offset, otherwise `false`.
   * @function observePageScroll
   * @example
   * mediaService.observePageScroll(100).subscribe(isScrolled => {
   *   console.log('Page scrolled past 100px:', isScrolled);
   * });
   */
  observePageScroll(offset: number, awaitDelay: number = 500): Observable<boolean> {
    // await delay for page change to complete
   return timer(awaitDelay)
    .pipe(
      switchMap(
        () => new Observable<boolean>(observer => {
          const activeContent = this._document.querySelector('ion-router-outlet .ion-page:not(.ion-page-hidden) ion-content') as HTMLIonContentElement;
          if (!(activeContent && typeof (activeContent as HTMLIonContentElement).getScrollElement === 'function'))
            return this.angularZone.run(() => observer.next(false));

          (activeContent as HTMLIonContentElement).getScrollElement().then((element: HTMLElement) => {
            const emitScrollState = () => {
              const scrollTop = element.scrollTop || 0;
              this.angularZone.run(() => observer.next(scrollTop > offset));
            };
            element.addEventListener('scroll', emitScrollState);
            emitScrollState();
            return () => element.removeEventListener('scroll', emitScrollState);
          });

        })
      ),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
      shareReplay(1)
    );
  }

  /**
   * @description Loads an SVG file and injects it into a target element.
   * @summary
   * This method fetches an SVG file from the specified path and injects its content
   * into the provided target element. The operation is performed outside Angular's
   * zone to improve performance, and the DOM update is brought back into the Angular
   * zone to ensure change detection.
   *
   * @param {string} path - The path to the SVG file.
   * @param {HTMLElement} target - The target element to inject the SVG content into.
   * @return {void}
   * @function loadSvgObserver
   * @example
   * const targetElement = document.getElementById('svg-container');
   * mediaService.loadSvgObserver('/assets/icons/icon.svg', targetElement);
   */
  loadSvgObserver(http: HttpClient, path: string, target: HTMLElement): void {
    this.angularZone.runOutsideAngular(() => {
      const svg$ = http.get(path, { responseType: 'text' }).pipe(
        takeUntil(this.destroy$),
        shareReplay(1)
      );
      svg$.subscribe(svg => {
        this.angularZone.run(() => {
          target.innerHTML = svg;
        });
      });
    });
  }

  /**
   * @description Determines if the current theme is dark mode.
   * @summary
   * Observes the `colorScheme$` observable and checks if the `DARK_PALETTE_CLASS` is present
   * on the document's root element or if the emitted color scheme is `dark`.
   *
   * @return {Observable<boolean>} An observable that emits `true` if dark mode is active, otherwise `false`.
   * @function isDarkMode
   * @example
   * mediaService.isDarkMode().subscribe(isDark => {
   *   console.log('Dark mode active:', isDark);
   * });
   */
  isDarkMode(): Observable<boolean> {
    if(!this.darkModeEnabled())
      return of(false);
    const documentElement = this._document.documentElement;
    return this.colorScheme$.pipe(
      map(scheme => documentElement.classList.contains(AngularEngineKeys.DARK_PALETTE_CLASS) || scheme === WindowColorSchemes.dark),
      distinctUntilChanged(),
       shareReplay(1),
      takeUntil(this.destroy$)
    );
  }

  /**
   * @description Toggles dark mode for a specific component.
   * @summary
   * Subscribes to the `colorScheme$` observable and adds or removes the `DARK_PALETTE_CLASS`
   * on the provided component based on the emitted color scheme.
   *
   * @param {ElementRef | HTMLElement} component - The target component to toggle dark mode on.
   * @return {void}
   * @function setDarkMode
   * @example
   * const component = document.querySelector('.my-component');
   * mediaService.setDarkMode(component);
   */
  setDarkMode(component: ElementRef | HTMLElement): void {
    this.colorScheme$.subscribe((scheme) => {
      this.toggleClass(
        component,
        AngularEngineKeys.DARK_PALETTE_CLASS,
        scheme === WindowColorSchemes.dark ? true : false
      );
    });
  }

  /**
   * @description Add or remove a CSS class on one or multiple elements.
   * @summary
   * Accepts an ElementRef, HTMLElement, or array of mixed elements and will add
   * or remove the provided `className` depending on the `add` flag. Operates
   * defensively: resolves ElementRef.nativeElement when needed and ignores
   * falsy entries.
   *
   * @param {(ElementRef | HTMLElement | unknown[])} component - Single element,
   * ElementRef, or array of elements to update.
   * @param {string} className - CSS class name to add or remove.
   * @param {boolean} [add=true] - Whether to add (true) or remove (false) the class.
   * @return {void}
   * @function toggleClass
   * @example
   * // Add a class to a single element
   * mediaService.toggleClass(element, 'active', true);
   *
   * // Remove a class from multiple elements
   * mediaService.toggleClass([element1, element2], 'hidden', false);
   */
  toggleClass(component: ElementRef | HTMLElement | unknown[], className: string, add: boolean = true): void {
    const components = Array.isArray(component) ? component : [component];
    components.forEach(element => {
      if ((element as ElementRef)?.nativeElement)
        element = (element as ElementRef).nativeElement;
      if(element instanceof HTMLElement) {
         switch (add) {
          case true:
            (element as HTMLElement).classList.add(className);
            break;
          case false:
            (element as HTMLElement).classList.remove(className);
            break;
        }
      }
    });
  }

  /**
   * @description Clean up internal subscriptions and observers used by the service.
   * @summary
   * Triggers completion of the internal `destroy$` subject so that any
   * Observables created with `takeUntil(this.destroy$)` will complete and
   * resources are released.
   *
   * @return {void}
   * @function destroy
   */
  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
