import { DecafToastOptions, DecafToastRole, IDecafToast } from '@decaf-ts/ui-decorators';
import { ToastOptions } from '@ionic/angular/standalone';
import { OverlayEventDetail, toastController } from '@ionic/core';

/**
 * @description Default toast configuration used by the toast utility.
 * @summary Provides the baseline Ionic toast settings applied before caller overrides are
 * merged. These defaults keep toast behavior consistent across the application.
 * @const {DecafToastOptions} DefaulOptions
 */
const DefaulOptions = {
  duration: 3000,
  position: 'top',
  animated: true,
};

/**
 * @description Cached singleton toast helper instance.
 * @summary Stores the shared `NgxToast` object returned by the factory so every caller uses
 * the same overlay state and toast lifecycle.
 *
 * @private
 * @type {NgxToast}
 */
let instance!: NgxToast;

/**
 * @description Active Ionic toast element reference.
 * @summary Tracks the toast element currently visible on screen so it can be dismissed,
 * replaced, or observed for dismissal events.
 *
 * @private
 * @type {HTMLIonToastElement | null}
 */
let component: HTMLIonToastElement | null;

/**
 * @description Toast notification helper for Ionic applications.
 * @summary Wraps Ionic's toast controller with a singleton-friendly API for showing
 * informational, success, warning, and error messages. The class centralizes overlay
 * creation, dismissal handling, and role extraction so application code stays small.
 * @class NgxToast
 * @implements {IDecafToast}
 *
 * @example
 * ```typescript
 * // Basic usage
 * const toast = getNgxToastComponent();
 * await toast.success('Operation completed successfully!');
 * await toast.error('Something went wrong!');
 *
 * // With custom options
 * const toast = getNgxToastComponent({
 *   duration: 5000,
 *   position: 'bottom'
 * });
 * await toast.inform('Custom toast message');
 *
 * // Handling dismissal role
 * const role = await toast.warn('Are you sure?');
 * if (role === 'cancel') {
 *   console.log('User cancelled');
 * }
 * ```
 *
 * @features
 * - Multiple toast types with semantic colors (error, success, warning, info)
 * - Automatic dismissal handling
 * - Singleton pattern for consistent behavior
 * - Promise-based API for better async handling
 * - Customizable options with sensible defaults
 * - Role-based dismissal tracking
 *
 * @since 1.0.0
 * @version 1.0.0
 */
export class NgxToast implements IDecafToast {
  /**
   * @description Merged toast options used when creating overlays.
   * @summary Holds the current configuration base that each toast operation reuses before
   * applying action-specific overrides such as color or duration.
   * @type {DecafToastOptions}
   */
  options: DecafToastOptions;

  /**
   * @description Creates a toast helper instance.
   * @summary Merges the provided options with the default toast configuration so all
   * subsequent notifications share the same baseline settings.
   * @param {Partial<ToastOptions>} [options={}] - Custom toast options to merge with defaults
   */
  constructor(options: Partial<ToastOptions> = {}) {
    this.options = Object.assign(DefaulOptions, options as DecafToastOptions);
  }

  /**
   * @description Displays an error toast.
   * @summary Presents a toast using the danger color and returns the dismissal role so
   * callers can react to user interaction after the toast closes.
   * @param {string} message - The error message to display
   * @returns {Promise<DecafToastRole>} Promise that resolves with the dismissal role
   * @example
   * ```typescript
   * const role = await toast.error('Failed to save data');
   * if (role === 'cancel') {
   *   // Handle cancellation
   * }
   * ```
   */
  async error(message: string): Promise<DecafToastRole> {
    (component as HTMLIonToastElement) = await this.create(
      Object.assign(this.options, { message: message, color: 'danger' })
    );
    const { role } = await this.handleDidDismiss(component as HTMLIonToastElement);
    return role;
  }

  /**
   * @description Presents a toast using the supplied options.
   * @summary Creates the Ionic toast element, dismisses any active toast, and presents the
   * new overlay. The `message` argument is merged into the final toast configuration so the
   * displayed text always reflects the caller input.
   * @param {string} message - Toast message to display
   * @param {Partial<ToastOptions>} [options] - Toast configuration options
   * @returns {Promise<void>} Promise that resolves when the toast is presented
   */
  async show(message: string, options?: Partial<ToastOptions>): Promise<void> {
    const config = Object.assign({}, this.options, { duration: 5000 }, options, { message });
    if (component) {
      await component.dismiss();
      component = null;
    }
    component = await this.create(config);
    await component.present();
  }

  /**
   * @description Creates a toast element.
   * @summary Builds and stores the Ionic toast element for later presentation or dismissal.
   * This helper is used internally by the public toast methods.
   * @param {Partial<ToastOptions>} options - Toast configuration options
   * @returns {Promise<HTMLIonToastElement>} Promise that resolves with the toast element
   */
  async create(options: Partial<ToastOptions>): Promise<HTMLIonToastElement> {
    return (component = await toastController.create(options));
  }

  /**
   * @description Displays an informational toast.
   * @summary Presents a neutral message with dark styling and any caller-provided options.
   * @param {string} message - The informational message to display
   * @param {Partial<ToastOptions>} [options={}] - Additional toast configuration
   * @returns {Promise<void>} Promise that resolves when toast is presented
   * @example
   * ```typescript
   * await toast.inform('Data loaded successfully');
   * ```
   */
  async inform(message: string, options: Partial<ToastOptions> = {}): Promise<void> {
    await this.show(message, { ...options, color: 'dark' });
  }

  /**
   * @description Displays a success toast.
   * @summary Presents a toast with success styling to confirm positive outcomes or completed
   * operations.
   * @param {string} message - The success message to display
   * @returns {Promise<void>} Promise that resolves when toast is presented
   * @example
   * ```typescript
   * await toast.success('Operation completed successfully!');
   * ```
   */
  async success(message: string): Promise<void> {
    await this.show(message, { color: 'success' });
  }

  /**
   * @description Displays a warning toast.
   * @summary Presents a toast with warning styling and returns the dismissal role after
   * the user closes it.
   * @param {string} message - The warning message to display
   * @returns {Promise<DecafToastRole>} Promise that resolves with the dismissal role
   * @example
   * ```typescript
   * const role = await toast.warn('This action cannot be undone');
   * if (role !== 'cancel') {
   *   // Proceed with action
   * }
   * ```
   */
  async warn(message: string): Promise<DecafToastRole> {
    (component as HTMLIonToastElement) = await this.create(Object.assign(this.options, { color: 'warning', message }));
    const { role } = await this.handleDidDismiss(component as HTMLIonToastElement);
    return role;
  }

  /**
   * @description Resolves the toast dismissal event.
   * @summary Waits for the Ionic dismissal promise, clears the cached toast element, and
   * returns the overlay event detail used by the public methods.
   * @param {HTMLIonToastElement} toast - The toast element to handle dismissal for
   * @returns {Promise<OverlayEventDetail>} Promise that resolves with dismissal event data
   * @private
   */
  private async handleDidDismiss(toast: HTMLIonToastElement): Promise<OverlayEventDetail> {
    const didDismiss = await toast.onDidDismiss();
    component = null;
    return didDismiss as OverlayEventDetail;
  }
}

/**
 * @description Returns the shared toast helper instance.
 * @summary Lazily creates the singleton on first call and reuses it for subsequent toast
 * operations. Any options passed after the first call are ignored because the instance
 * has already been initialized.
 * @function getNgxToastComponent
 * @param {Partial<ToastOptions>} [options={}] - Optional toast configuration options
 * @returns {NgxToast} Singleton NgxToast instance
 * @example
 * ```typescript
 * // Get default instance
 * const toast = getNgxToastComponent();
 *
 * // Get instance with custom options
 * const toast = getNgxToastComponent({
 *   duration: 5000,
 *   position: 'bottom',
 *   animated: false
 * });
 *
 * // All subsequent calls return the same instance
 * const sameToast = getNgxToastComponent(); // Returns existing instance
 * ```
 * @memberOf utils.toast
 */
export function getNgxToast(options: Partial<ToastOptions> = {}): NgxToast {
  if (!instance) {
    instance = new NgxToast(options);
  }
  return instance;
}
