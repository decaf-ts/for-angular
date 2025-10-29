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

export abstract class NgxEventHandler<PAYLOAD> extends LoggedClass {
	abstract handle(evt: IBaseCustomEvent | CustomEvent<PAYLOAD>): Promise<unknown>;
}
