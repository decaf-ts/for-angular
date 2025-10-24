import { LoadingOptions } from "@ionic/angular";
import { HTMLIonOverlayElement, loadingController } from "@ionic/core";
import { KeyValue } from "src/lib/engine/types";
import { LoggedClass } from "@decaf-ts/logging";

/**
 * @fileoverview CMX Loading Utility for Ionic Angular Applications
 * @description This utility provides a comprehensive loading overlay management system
 * with progress tracking, message updates, and singleton pattern implementation.
 * It wraps Ionic's loading controller with enhanced features for better user experience.
 *
 * @version 1.0.0
 * @since 1.0.0
 * @author CMX Development Team
 * @encoding UTF-8
 */

/**
 * @description Global singleton instance of NgxLoadingComponent.
 * @summary Private variable to ensure only one loading instance exists throughout
 * the application lifecycle. This prevents multiple loading overlays from
 * conflicting with each other and ensures consistent behavior.
 *
 * @private
 * @type {NgxLoadingComponent}
 */
let instance: NgxLoadingComponent;

/**
 * @description Enhanced loading overlay management class.
 * @summary This class provides a robust interface for managing Ionic loading overlays
 * with additional features like progress tracking, message updates, and error handling.
 * It implements a singleton pattern to ensure only one loading overlay is active at a time.
 *
 * @class NgxLoadingComponent
 */
export class NgxLoadingComponent extends LoggedClass {

  /**
   * @description Current active loading element instance.
   * @summary Reference to the Ionic loading element that is currently displayed.
   * This property is undefined when no loading overlay is active, allowing
   * for proper state management and cleanup operations.
   *
   * @private
   * @type {HTMLIonLoadingElement | undefined}
   * @memberOf NgxLoadingComponent
   */
  private instance!: HTMLIonLoadingElement | undefined;

  /**
   * @description Current loading message text.
   * @summary Stores the current message being displayed in the loading overlay.
   * This property is updated whenever the loading message changes and is used
   * for message retrieval and progress update operations.
   *
   * @private
   * @type {string}
   * @memberOf NgxLoadingComponent
   */
  private message!: string;

  /**
   * @description Current progress percentage for loading operations.
   * @summary Tracks the progress of loading operations as a percentage (0-100).
   * This value is used for progress updates and is automatically managed
   * to prevent values exceeding 100% or going backwards unintentionally.
   *
   * @private
   * @type {number}
   * @default 0
   * @memberOf NgxLoadingComponent
   */
  private progress: number = 0;

  /**
   * @description Default configuration options for loading overlays.
   * @summary Provides default styling and behavior configuration for all loading
   * overlays created by this class. These options can be overridden when creating
   * specific loading instances while maintaining consistent defaults across the application.
   *
   * @private
   * @type {KeyValue}
   * @memberOf NgxLoadingComponent
   */
  private options: KeyValue = {
    cssClass: "aeon-loading",
    duration: undefined,
    message: 'Carregando...',
    spinner: "crescent",
    backdropDismiss: false,
    showBackdrop: true,
    animated: true
  };


  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor() {
    super();
  }
  /**
   * @description Checks if a loading overlay is currently visible.
   * @summary Determines whether a loading overlay is currently active and displayed
   * to the user. This method is useful for preventing multiple loading overlays
   * and for conditional logic based on loading state.
   *
   * @returns {boolean} True if loading overlay is visible, false otherwise
   * @memberOf NgxLoadingComponent
   *
   * @example
   * ```typescript
   * const loading = getNgxLoadingComponent();
   *
   * if (!loading.isVisible()) {
   *   await loading.show('Loading data...');
   * }
   *
   * // Conditional operations based on loading state
   * if (loading.isVisible()) {
   *   await loading.update('Processing...', 50);
   * }
   * ```
   */
  isVisible(): boolean {
    return this.instance ? true : false;
  }

  /**
   * @description Displays a loading overlay with specified message and options.
   * @summary Creates and presents a loading overlay to the user with customizable
   * message and configuration options. If a loading overlay is already visible,
   * it updates the existing overlay instead of creating a new one to prevent conflicts.
   *
   * @param {string} message - The message to display in the loading overlay
   * @param {LoadingOptions} [options] - Optional configuration for the loading overlay
   * @returns {Promise<void>} Promise that resolves when the loading overlay is displayed
   * @memberOf NgxLoadingComponent
   *
   * @example
   * ```typescript
   * const loading = getNgxLoadingComponent();
   *
   * // Simple loading with message
   * await loading.show('Loading...');
   *
   * // Loading with custom options
   * await loading.show('Processing data...', {
   *   duration: 5000,
   *   spinner: 'bubbles',
   *   cssClass: 'custom-loading'
   * });
   *
   * // Loading with backdrop dismiss
   * await loading.show('Please wait...', {
   *   backdropDismiss: true
   * });
   * ```
   */
  async show(message: string, options?: LoadingOptions): Promise<void> {
    try {
      this.message = message;
      if (this.isVisible())
        return this.update(message);
      this.instance = await loadingController.create(await this.getOptions(options, message)) as HTMLIonLoadingElement;
      await this.instance.present();
    } catch (error: unknown) {
      this.log.for(this.show).error((error as Error)?.message || error as string);
    }
  }

  /**
   * @description Updates the loading overlay message and optionally tracks progress.
   * @summary Modifies the current loading overlay's message and can display progress
   * information. If no loading overlay exists, creates a new one with a default duration.
   * Supports both simple message updates and progress tracking with percentage display.
   *
   * @param {string} message - The new message to display
   * @param {boolean | number} [isProgressUpdate=false] - Progress update mode or percentage value
   * @returns {Promise<void>} Promise that resolves when the update is complete
   * @memberOf NgxLoadingComponent
   *
   * @example
   * ```typescript
   * const loading = getNgxLoadingComponent();
   * await loading.show('Starting process...');
   *
   * // Simple message update
   * await loading.update('Processing data...');
   *
   * // Progress update with percentage
   * await loading.update('Loading files...', 25);
   * await loading.update('Processing files...', 50);
   * await loading.update('Finalizing...', 90);
   *
   * // Progress update with boolean flag
   * await loading.update('75', true); // Shows "Original Message (75%)"
   * ```
   */
  async update(message: string, isProgressUpdate: boolean | number = false): Promise<void> {
    if (!this.instance)
      return await this.show(message, { duration: 5000 });

    if (isProgressUpdate) {
      if (typeof isProgressUpdate === "number" && Number(isProgressUpdate)) {
        if (isProgressUpdate <= this.progress)
          isProgressUpdate = this.progress + 10;
        this.progress = isProgressUpdate;
        if (this.progress > 100)
          this.progress = 99;
        this.instance.message = `${message} (${this.progress}%)`;
      } else {
        this.instance.message = `${this.message} (${message}%)`;
      }
    } else {
      this.message = this.instance.message = message;
    }
  }

  /**
   * @description Removes the loading overlay from display.
   * @summary Dismisses the currently active loading overlay and resets internal state.
   * Includes error handling for cases where no loading overlay is present.
   * Automatically resets progress tracking and clears the loading instance reference.
   *
   * @returns {Promise<void>} Promise that resolves when the loading overlay is removed
   * @memberOf NgxLoadingComponent
   *
   * @example
   * ```typescript
   * const loading = getNgxLoadingComponent();
   * await loading.show('Loading...');
   *
   * // Perform some async operation
   * await performDataOperation();
   *
   * // Remove loading overlay
   * await loading.remove();
   *
   * // Safe to call even if no loading is present
   * await loading.remove(); // Logs warning but doesn't throw error
   * ```
   */
  async remove(): Promise<void> {
    const loading: HTMLIonOverlayElement = this.instance as unknown as HTMLIonOverlayElement;
    if (!loading)
      return this.log.for(this.remove).info("Try Remove loading but no loading is present. Promise resolve will be called anyway");
    this.instance = undefined
    this.progress = 0;
    await loading.dismiss();
  }

  /**
   * @description Merges custom options with default loading configuration.
   * @summary Combines the default loading options with user-provided options,
   * ensuring that custom configurations override defaults while maintaining
   * consistent behavior. The message parameter takes precedence over options.message.
   *
   * @param {LoadingOptions} [options={}] - Custom loading options to merge
   * @param {string} [message] - Optional message to override options.message
   * @returns {LoadingOptions} The merged configuration object
   * @memberOf NgxLoadingComponent
   *
   * @example
   * ```typescript
   * // Internal usage - automatically called by show() method
   * const config = await loading.getOptions({
   *   duration: 3000,
   *   spinner: 'bubbles'
   * }, 'Custom message');
   *
   * // Result: default options + custom options + message override
   * ```
   */
  async getOptions(options: LoadingOptions = {}, message?: string): Promise<LoadingOptions> {
    return Object.assign({}, this.options, options, { message: message || this.options['message'] });
  }

  /**
   * @description Retrieves the current loading message.
   * @summary Returns the message currently being displayed in the loading overlay.
   * This method provides access to the current message state for external components
   * that may need to know what message is currently being shown to the user.
   *
   * @returns {Promise<string>} Promise resolving to the current loading message
   * @memberOf NgxLoadingComponent
   *
   * @example
   * ```typescript
   * const loading = getNgxLoadingComponent();
   * await loading.show('Processing...');
   *
   * const currentMessage = await loading.getMessage();
   * console.log('Current loading message:', currentMessage); // "Processing..."
   *
   * // Useful for debugging or state management
   * if (await loading.getMessage() === 'Processing...') {
   *   await loading.update('Almost done...', 90);
   * }
   * ```
   */
  async getMessage(): Promise<string> {
    return this.message;
  }
}

/**
 * @description Factory function for obtaining the singleton NgxLoadingComponent instance.
 * @summary Implements the singleton pattern by creating a single global instance
 * of NgxLoadingComponent on first call and returning the same instance on subsequent calls.
 * This ensures consistent loading overlay behavior throughout the application.
 *
 * @returns {NgxLoadingComponent} The singleton NgxLoadingComponent instance
 * @memberOf NgxLoadingComponent
 *
 * @example
 * ```typescript
 * // Get the singleton instance
 * const loading = getNgxLoadingComponent();
 *
 * // All calls return the same instance
 * const loading1 = getNgxLoadingComponent();
 * const loading2 = getNgxLoadingComponent();
 * console.log(loading1 === loading2); // true
 *
 * // Use throughout the application
 * await loading.show('Loading...');
 * // ... later in another component ...
 * await getNgxLoadingComponent().update('Still loading...', 50);
 * ```
 */
export function getNgxLoadingComponent(): NgxLoadingComponent {
  if (!instance)
    instance = new NgxLoadingComponent();
  return instance;
}
