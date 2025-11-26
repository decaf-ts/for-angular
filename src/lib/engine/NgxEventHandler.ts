/**
 * @module module:lib/engine/NgxEventHandler
 * @description Event handler base class used by Decaf components.
 * @summary Defines NgxEventHandler which standardizes event handling logic and provides
 * logging support for handlers that process custom events emitted by components.
 *
 * @link {@link NgxEventHandler}
 */
import { LoggedClass } from "@decaf-ts/logging";
import { IBaseCustomEvent } from "./interfaces";
import { DecafComponent, DecafEventHandler } from "@decaf-ts/ui-decorators";
import { Router } from "@angular/router";

export abstract class NgxEventHandler extends DecafEventHandler {
  async refresh(args?: unknown[]): Promise<void> {
    this.log.for(this.refresh).debug(`Refresh called with args: ${args}`);
  }
}
