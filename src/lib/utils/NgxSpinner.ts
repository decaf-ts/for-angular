import { IDecafSpinner } from '@decaf-ts/ui-decorators';
import type { LoadingOptions } from '@ionic/angular/standalone';
import { loadingController } from '@ionic/core';
import { getLogger } from '../engine/helpers';

/**
 * @module lib/utils/NgxSpinner
 * @description Loading overlay utility for Ionic Angular applications.
 * @summary Exposes the `NgxSpinner` singleton helper and the `getNgxSpinner()` factory used
 * to manage Ionic loading overlays with progress updates, message changes, and safe dismissal.
 * The module centralizes loading state so components can request a shared spinner instance
 * instead of handling overlay lifecycles directly.
 */

/**
 * @description Cached singleton factory instance for the loading utility.
 * @summary Holds the shared `NgxSpinner` reference returned by `getNgxSpinner()`. This
 * ensures the application reuses the same loading controller wrapper across calls and
 * avoids competing overlays or inconsistent progress state.
 *
 * @private
 * @type {NgxSpinner}
 */
let instance: NgxSpinner;

/**
 * @description Loading overlay manager for Ionic UI flows.
 * @summary Wraps `loadingController` with a singleton-friendly API for showing, updating,
 * and dismissing loading overlays. It keeps track of the active message and progress value
 * so callers can update the same overlay instead of creating new ones.
 *
 * @class NgxSpinner
 * @implements {IDecafSpinner}
 */
export class NgxSpinner implements IDecafSpinner {
  /**
   * @description Active Ionic loading element reference.
   * @summary Stores the overlay currently presented to the user so it can be updated or
   * dismissed later. The value is `undefined` when no spinner is visible.
   *
   * @private
   * @type {HTMLIonLoadingElement | undefined}
   * @memberOf NgxSpinner
   */
  private instance!: HTMLIonLoadingElement | undefined;

  /**
   * @description Current loading message.
   * @summary Mirrors the latest message shown by the overlay so follow-up updates can reuse
   * it when progress mode is enabled.
   *
   * @private
   * @type {string}
   * @memberOf NgxSpinner
   */
  private message!: string;

  /**
   * @description Current progress percentage for the visible overlay.
   * @summary Tracks the last emitted progress value so callers can advance the spinner in
   * controlled increments without regressing or exceeding the expected range.
   *
   * @private
   * @type {number}
   * @default 0
   * @memberOf NgxSpinner
   */
  private progress: number = 0;

  /**
   * @description Default Ionic loading configuration.
   * @summary Provides the baseline overlay styling and behavior used whenever no explicit
   * options are supplied. Callers can override individual fields per invocation.
   *
   * @private
   * @type {LoadingOptions}
   * @memberOf NgxSpinner
   */
  private options: LoadingOptions = {
    cssClass: 'aeon-loading',
    duration: undefined,
    message: 'Carregando...',
    spinner: 'crescent',
    backdropDismiss: false,
    showBackdrop: true,
    animated: true,
  };

  /**
   * @description Checks whether a loading overlay is visible.
   * @summary Returns `true` when the singleton has an active Ionic loading element and
   * `false` otherwise. Useful for preventing duplicate overlays before starting a new task.
   *
   * @returns {boolean} True if loading overlay is visible, false otherwise
   * @memberOf NgxSpinner
   *
   * @example
   * ```typescript
   * const loading = getCmxLoading();
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
    return !!this.instance;
  }

  /**
   * @description Presents the loading overlay with a message and optional options.
   * @summary Creates the overlay on first call and reuses the existing one on subsequent
   * calls. When a loading object is passed as the first argument, its message becomes the
   * displayed text and the remaining fields are treated as options.
   *
   * @param {string | LoadingOptions} message - Message text or a full loading options object
   * @param {LoadingOptions} [options] - Optional configuration for the loading overlay
   * @returns {Promise<void>} Promise that resolves when the loading overlay is displayed
   * @memberOf NgxSpinner
   *
   * @example
   * ```typescript
   * const loading = getCmxLoading();
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
  async show(message: string | LoadingOptions, options?: LoadingOptions): Promise<void> {
    if (typeof message === 'object') {
      options = message;
      message = options.message as string;
    }
    try {
      this.message = message;
      if (this.isVisible()) return this.update(message);
      this.instance = (await loadingController.create(
        await this.getOptions(options, message)
      )) as HTMLIonLoadingElement;
      await this.instance.present();
    } catch (error: unknown) {
      getLogger(this.show).error((error as Error)?.message || String(error));
    }
  }

  /**
   * @description Updates the overlay message and optionally advances progress.
   * @summary Reuses the current loading element when one is visible, otherwise opens a new
   * one with a fallback duration. A numeric second argument advances the stored progress,
   * while `true` treats the first argument as the progress label suffix.
   *
   * @param {string} message - The new message to display
   * @param {boolean | number} [isProgressUpdate=false] - Progress update mode or percentage value
   * @returns {Promise<void>} Promise that resolves when the update is complete
   * @memberOf NgxSpinner
   *
   * @example
   * ```typescript
   * const loading = getCmxLoading();
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
    if (!this.instance) return await this.show(message, { duration: 5000 });

    if (isProgressUpdate) {
      if (typeof isProgressUpdate === 'number' && Number(isProgressUpdate)) {
        if (isProgressUpdate <= this.progress) isProgressUpdate = this.progress + 10;
        this.progress = isProgressUpdate;
        if (this.progress > 100) this.progress = 99;
        this.instance.message = `${message} (${this.progress}%)`;
      } else {
        this.instance.message = `${this.message} (${message}%)`;
      }
    } else {
      this.message = this.instance.message = message;
    }
  }

  /**
   * @description Dismisses the current loading overlay.
   * @summary Clears the cached overlay reference, resets progress, and dismisses the visible
   * Ionic loading element if one exists.
   *
   * @returns {Promise<void>} Promise that resolves when the loading overlay is removed
   * @memberOf NgxSpinner
   *
   * @example
   * ```typescript
   * const loading = getCmxLoading();
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
    const loading = this.instance;
    this.instance = undefined;
    this.progress = 0;
    if (loading) {
      await loading.dismiss();
    }
  }

  /**
   * @description Merges custom loading options with the defaults.
   * @summary Produces the final overlay configuration by combining the class defaults,
   * caller-provided overrides, and the effective message value.
   *
   * @param {LoadingOptions} [options={}] - Custom loading options to merge
   * @param {string} [message] - Optional message to override options.message
   * @returns {LoadingOptions} The merged configuration object
   * @memberOf NgxSpinner
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
    return Object.assign({}, this.options, options, {
      message: message || this.options['message'],
    });
  }

  /**
   * @description Retrieves the current loading message.
   * @summary Returns the latest message tracked by the spinner instance so callers can
   * inspect the overlay state without accessing the Ionic element directly.
   *
   * @returns {Promise<string>} Promise resolving to the current loading message
   * @memberOf NgxSpinner
   *
   * @example
   * ```typescript
   * const loading = getCmxLoading();
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
 * @description Returns the shared `NgxSpinner` instance.
 * @summary Lazily creates the singleton on first call and reuses it afterwards. The
 * optional options argument is accepted for API compatibility but does not alter the
 * cached instance once it exists.
 *
 * @param {Partial<LoadingOptions>} [options={}] - Optional spinner configuration placeholder
 * @returns {NgxSpinner} The singleton NgxSpinner instance
 * @memberOf NgxSpinner
 *
 * @example
 * ```typescript
 * // Get the singleton instance
 * const loading = getCmxLoading();
 *
 * // All calls return the same instance
 * const loading1 = getCmxLoading();
 * const loading2 = getCmxLoading();
 * console.log(loading1 === loading2); // true
 *
 * // Use throughout the application
 * await loading.show('Loading...');
 * // ... later in another component ...
 * await getCmxLoading().update('Still loading...', 50);
 * ```
 */
export function getNgxSpinner(options: Partial<LoadingOptions> = {}): NgxSpinner {
  if (!instance) {
    instance = new NgxSpinner();
  }
  return instance;
}
