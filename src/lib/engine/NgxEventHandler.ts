import {LoggedClass} from "@decaf-ts/logging";
import { IBaseCustomEvent } from "./interfaces";

export abstract class NgxEventHandler<PAYLOAD> extends LoggedClass {
	abstract handle(evt: IBaseCustomEvent | CustomEvent<PAYLOAD>): Promise<unknown>;
}
