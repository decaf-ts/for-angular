
import { NgxEventHandler, ICrudFormEvent, KeyValue } from "src/lib/engine";
import { getNgxToastComponent, NgxToastComponent } from "../utils/NgxToastComponent";
import { Router } from "@angular/router";
import { setOnWindow } from "src/lib/utils/helpers";


/**
 * @description Handler for login events
 * @summary This class extends the EventHandler to provide specific handling for login events.
 * It validates the presence of username and password in the event data.
 * @class
 * @example
 * const loginHandler = new LoginHandler();
 * const event = {
 *   data: { username: 'user', password: 'pass' }
 * };
 * const isValid = await loginHandler.handle(event);
 * console.log(isValid); // true
 */
export class LoginHandler extends NgxEventHandler<ICrudFormEvent> {

  private toastComponent: NgxToastComponent = getNgxToastComponent();

  constructor(protected router: Router) {
    super();
  }

  /**
   * @description Handles the login event
   * @summary This method extracts the username and password from the event data
   * and checks if both are truthy values. It returns true if both username and
   * password are present, false otherwise.
   * @param {ICrudFormEvent} event - The event object containing login data
   * @return {Promise<boolean>} A promise that resolves to true if login is valid, false otherwise
   */
  async handle(event: ICrudFormEvent): Promise<void> {
    const { username, password } = event.data as KeyValue;
    const success = !!username && !!password;
    if(success) {
      setOnWindow('loggedUser', username);
      setTimeout(async () => {
        await this.router.navigate(['/dashboard']);
      }, 50);
    }

    const toast = await this.toastComponent.show({
      message: success ? 'Login successful!' : 'Invalid username or password.',
      duration: 3000,
      color: success ? 'dark' : 'danger',
      position: 'top',
    });
    await toast.present();
  }
}
