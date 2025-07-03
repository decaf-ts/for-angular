import { EventHandler } from "@decaf-ts/ui-decorators";
import { CrudFormEvent } from "src/lib/engine/types";

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
export class LoginHandler extends EventHandler {
  /**
   * @description Handles the login event
   * @summary This method extracts the username and password from the event data
   * and checks if both are truthy values. It returns true if both username and
   * password are present, false otherwise.
   * @param {CrudFormEvent} event - The event object containing login data
   * @return {Promise<boolean>} A promise that resolves to true if login is valid, false otherwise
   */
  async handle(event: CrudFormEvent): Promise<boolean> {
    const { username, password } = event.data;
    return !!username && !!password;
  }
}
