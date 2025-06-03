import { toastController } from "@ionic/core";
import { ToastOptions } from '@ionic/angular/standalone';

/**
 * @description Type definition for toast dismissal roles
 * @summary Defines the possible role values that can be returned when a toast is dismissed.
 * The role indicates how the toast was dismissed (e.g., by clicking a cancel button,
 * timing out, or programmatically).
 *
 * @typedef {('cancel' | string | undefined)} ToastRole
 * @memberOf module:for-angular
 */
export type ToastRole = 'cancel' | string | undefined;

/**
 * @description Default configuration options for toast notifications
 * @summary Defines the standard configuration used for toast notifications when specific
 * options are not provided. These defaults ensure a consistent appearance and behavior
 * for toasts throughout the application.
 *
 * @typedef {Object} DefaultToastOptions
 * @property {number} duration - Duration in milliseconds the toast should be displayed (3000ms default)
 * @property {string} position - Position on screen where the toast appears ('top' default)
 * @property {boolean} animated - Whether the toast should use animations (true default)
 *
 * @const {DefaultToastOptions}
 * @memberOf module:for-angular
 */
const DefaulOptions = {
  duration: 3000,
  position: 'top',
  animated: true
}

let instance!: NgxToastComponent;
let component: HTMLIonToastElement | null;

/**
 * @description Toast notification component for Angular applications
 * @summary This class provides a wrapper around Ionic's toast controller to display
 * various types of toast notifications (error, warning, success, information).
 * It manages toast creation, presentation, and dismissal, ensuring only one toast
 * is displayed at a time. The component uses a singleton pattern to maintain a single
 * instance throughout the application.
 *
 * @param {ToastOptions} options - Configuration options for the toast notifications
 *
 * @class NgxToastComponent
 * @example
 * ```typescript
 * // Get the toast component instance
 * const toast = getNgxToastComponent();
 *
 * // Display different types of notifications
 * toast.success('Operation completed successfully');
 * toast.error('An error occurred');
 * toast.warn('Warning: This action cannot be undone');
 * toast.inform('The process is starting');
 * ```
 */
export class NgxToastComponent {

  /**
   * @description Configuration options for toast notifications
   * @summary Stores the toast configuration options, combining default options with any
   * custom options provided during initialization.
   */
  private readonly options: ToastOptions;

  /**
   * @description Creates a new toast component instance
   * @summary Initializes the toast component with the provided options, merging them
   * with the default options.
   *
   * @param {ToastOptions} options - Configuration options for toast notifications
   */
  constructor(options: ToastOptions){
    this.options = Object.assign(DefaulOptions, options);
  }

  /**
   * @description Displays an error toast notification
   * @summary Shows a toast notification with error styling (danger color).
   * This method is used to display error messages to the user. It waits for the
   * toast to be dismissed and returns the dismissal role.
   *
   * @param {string} message - The error message to display
   * @return {Promise<ToastRole>} A promise that resolves to the toast dismissal role
   */
  async error(message: string): Promise<ToastRole>  {
    (component as HTMLIonToastElement) = await this.show(Object.assign(this.options, {message: message, color: "danger"}));
    const {role} = await this.handleDidDismiss(component as HTMLIonToastElement);
    return role;
  }

  /**
   * @description Creates and displays a toast notification
   * @summary Internal method that handles the creation and presentation of toast notifications.
   * It ensures only one toast is displayed at a time by dismissing any existing toast before
   * creating a new one. It also adds a small delay after dismissal to prevent visual glitches.
   *
   * @param {ToastOptions} options - Configuration options for the toast
   * @return {Promise<HTMLIonToastElement>} A promise that resolves to the created toast element
   */
  private async show(options: ToastOptions): Promise<HTMLIonToastElement>{
    options = Object.assign({duration: 5000}, options);
    let timeout = 0;
    if(!!component) {
      await component.dismiss();
      timeout = 200;
    }
    component = await toastController.create(options);
    setTimeout(async() => await (component as HTMLIonToastElement).present(), timeout);
    return component;
  }

  /**
   * @description Displays an informational toast notification
   * @summary Shows a toast notification with default styling (no specific color).
   * This method is used to display general informational messages to the user.
   * Unlike error and warning methods, it doesn't wait for dismissal or return a role.
   *
   * @param {string} message - The informational message to display
   * @return {Promise<void>} A promise that resolves when the toast is displayed
   */
  async inform(message: string): Promise<void>  {
    await this.show(Object.assign(this.options, {message: message, color: ""}));
  }

  /**
   * @description Displays a success toast notification
   * @summary Shows a toast notification with success styling (green color).
   * This method is used to display success messages to the user, typically
   * after an operation has completed successfully. Like the inform method,
   * it doesn't wait for dismissal or return a role.
   *
   * @param {string} message - The success message to display
   * @return {Promise<void>} A promise that resolves when the toast is displayed
   */
  async success(message: string): Promise<void>  {
    await this.show(Object.assign(this.options, {message: message, color: "success"}));
  }

  /**
   * @description Displays a warning toast notification
   * @summary Shows a toast notification with warning styling (yellow/amber color).
   * This method is used to display warning messages to the user, typically for
   * actions that require caution. Like the error method, it waits for the toast
   * to be dismissed and returns the dismissal role.
   *
   * @param {string} message - The warning message to display
   * @return {Promise<ToastRole>} A promise that resolves to the toast dismissal role
   */
  async warn(message: string): Promise<ToastRole> {
    (component as HTMLIonToastElement) =  await this.show(Object.assign(this.options, {message: message, color: "warning"}));
    const {role} = await this.handleDidDismiss(component as HTMLIonToastElement);
    return role;
  }

  /**
   * @description Handles toast dismissal events
   * @summary Internal method that waits for a toast to be dismissed and cleans up
   * the component reference. It returns the dismissal data, which includes the role
   * that indicates how the toast was dismissed (e.g., timeout, user interaction).
   *
   * @param {HTMLIonToastElement} toast - The toast element to handle dismissal for
   * @return {Promise<any>} A promise that resolves to the dismissal data
   */
  private async handleDidDismiss(toast: HTMLIonToastElement): Promise<any> {
    const didDismiss = await toast.onDidDismiss();
    component = null;
    return didDismiss;
  }
}


/**
 * @description Factory function to get the singleton toast component instance
 * @summary This function implements the singleton pattern for the NgxToastComponent.
 * It returns the existing instance if one exists, or creates a new instance with the
 * provided options if none exists. This ensures that only one toast component is used
 * throughout the application, maintaining consistent behavior and appearance.
 *
 * @param {ToastOptions} [options={}] - Optional configuration options for the toast component
 * @return {NgxToastComponent} The singleton toast component instance
 *
 * @function getNgxToastComponent
 * @memberOf module:for-angular
 */
export function getNgxToastComponent(options: ToastOptions = {}): NgxToastComponent {
  if(!instance)
    instance = new NgxToastComponent(options);
  return instance;
}
