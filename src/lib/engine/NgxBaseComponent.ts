import { Input, Component, Inject, ViewChild, ElementRef } from '@angular/core';
import { StringOrBoolean } from 'src/lib/engine/types';
import { getLocaleFromClassName } from 'src/lib/helpers/utils';
import { stringToBoolean } from 'src/lib/helpers/string';

/**
 * Base component class that provides common functionality for all Decaf components.
 * This abstract class handles localization and element references.
 * 
 * @abstract
 * @class NgxBaseComponent
 */
@Component({standalone: true, template: ""})
export abstract class NgxBaseComponent {

  /**
   * Reference to the component's element.
   * Provides access to the native DOM element of the component.
   * 
   * @type {ElementRef}
   * @memberof NgxBaseComponent
   */
  @ViewChild('component', { read: ElementRef })
  component!: ElementRef;

  /**
   * The locale to be used for translations.
   * Can be overridden by input property.
   * 
   * @type {string}
   * @memberof NgxBaseComponent
   */
  @Input()
  locale!: string;

  /**
   * Determines if the component should be translated.
   * Can be a boolean value or a string that can be converted to a boolean.
   * 
   * @type {StringOrBoolean}
   * @default false
   * @memberof NgxBaseComponent
   */
  @Input()
  translatable: StringOrBoolean = false;

  /**
   * Additional CSS class names to apply to the component.
   * 
   * @type {string}
   * @default &quot;&quot;
   * @memberof NgxBaseComponent
   */
  @Input()
  className: string = "";

  /**
   * Component platform style.
   * Controls the visual appearance based on platform design guidelines.
   * 
   * @type {(&quot;ios&quot; | &quot;md&quot; | undefined)}
   * @default &quot;ios&quot;
   * @memberof NgxBaseComponent
   */
  @Input()
  mode: "ios" | "md" | undefined = "ios";

  /**
   * The locale derived from the component's class name.
   * Used as a fallback when no explicit locale is provided.
   * 
   * @type {string}
   * @memberof NgxBaseComponent
   */
  componentLocale!: string;

  /**
   * Creates an instance of NgxBaseComponent.
   * 
   * @param {string} instance - The instance token used to derive the component locale
   * @memberof NgxBaseComponent
   * @constructor
   */
  constructor(@Inject('instanceToken') private instance: string) {
    this.componentLocale = getLocaleFromClassName(instance);
  }

  /**
   * Gets the appropriate locale string based on the translatable flag and available locales.
   * 
   * @param {StringOrBoolean} translatable - Whether the component should be translated
   * @returns {string} The locale string to use for translation, or empty string if not translatable
   * @memberof NgxBaseComponent
   */
  getLocale(translatable: StringOrBoolean): string {
    this.translatable = stringToBoolean(translatable);
    if(!this.translatable)
      return "";
    if(!this.locale)
      return this.componentLocale;
    return this.locale;
  }
}