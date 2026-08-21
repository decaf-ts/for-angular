/**
 * @module app/user-requests/handlers/user-data-handler
 * @summary Demo app `user-data` user request handler for the DECAF-45 engine.
 * @description Application-owned handler (not a library example): registered
 * implicitly through the `@userRequest("user-data")` decorator metadata, so
 * `UserRequestHandler.handle(request, renderingEngine)` can resolve it by
 * request `type` and dispatch through the provided rendering-engine facade.
 * The payload/result shape (`UserData`) mirrors the shared test fixture and is
 * normalized exactly the same way (name trimmed, email lowercased).
 */

import type { Context, ContextFlags, ContextualArgs } from '@decaf-ts/core';
import type { CancelledError } from '@decaf-ts/ui-decorators/user-requests';
import {
  userRequest,
  UserRequestHandler,
} from '@decaf-ts/ui-decorators/user-requests';
import type { UserRequest } from '@decaf-ts/ui-decorators/user-requests';

/**
 * @summary Payload/result shape resolved by the `user-data` handler.
 * @description The normalized user data returned to the caller: `name` is the
 * trimmed full name, `email` is the lowercase-encoded e-mail address.
 */
export interface UserData {
  name: string;
  email: string;
}

/**
 * @template T - The resolved user-data payload type (the concrete `UserData`
 * shape in this app), binding the inherited `UserRequestHandler<T>` generic.
 * @summary Demo `user-data` handler.
 * @description Presents the user request through the rendering-engine facade
 * (the generic library modal) and normalizes the `T` submission exactly like
 * the shared test fixture: `name` trimmed, `email` lowercased. Logging follows
 * the core `Service` golden rules — `...args` contextual rest args, `logCtx`
 * at the operation with context creation (`true`), then info/verbose/debug
 * levels across the lifecycle and an error log when resolution fails.
 */
@userRequest('user-data')
export class UserDataUserRequestHandler extends UserRequestHandler<UserData> {
  /**
   * Resolves the `user-data` request.
   * @param {UserRequest<UserData>} request - The user request carrying the
   * `user-data` request id/type.
   * @param {...ContextualArgs<Context<ContextFlags<any>>>} args - Optional
   * contextual rest args (call context or operation arguments) following the
   * core `Service` golden rules; forwarded to `logCtx`.
   * @returns {Promise<UserData>} Resolves with the normalized submission
   * (`name` trimmed, `email` lowercased) once the user submits the modal.
   * @throws {CancelledError} When the user cancels the request
   * mid-resolution.
   * @throws {import('@decaf-ts/db-decorators').ValidationError} When the
   * submitted form fails validation.
   */
  async handle(
    request: UserRequest<UserData>,
    ...args: ContextualArgs<Context<ContextFlags<any>>>
  ): Promise<UserData> {
    const { log } = await this.logCtx([request, ...args], this.handle, true);
    log.info(`Resolving user-data request "${request.id}"`);
    log.debug(`User-data request payload: ${JSON.stringify(request.payload)}`);
    try {
      const submitted = await this.getInput(request, ...args);
      log.verbose(`Normalizing user-data submission for request "${request.id}"`);
      const normalized: UserData = {
        name: submitted.name.trim(),
        email: submitted.email.toLowerCase(),
      };
      log.info(`Resolved user-data request "${request.id}"`);
      log.debug(`Normalized user-data payload: ${JSON.stringify(normalized)}`);
      return normalized;
    } catch (error) {
      log.error(`Failed to resolve user-data request "${request.id}"`, error);
      throw error;
    }
  }
}
