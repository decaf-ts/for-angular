/**
 * @module module:lib/engine/NgxEventHandler
 * @description Event handler base class used by Decaf components.
 * @summary Defines NgxEventHandler which standardizes event handling logic and provides
 * logging support for handlers that process custom events emitted by components.
 *
 * @link {@link NgxEventHandler}
 */
import { ChangeDetectorRef } from "@angular/core";
import { CrudOperationKeys, DecafEventHandler } from "@decaf-ts/ui-decorators";
import { FunctionLike } from "src/lib/engine";

export abstract class NgxEventHandler extends DecafEventHandler {

  //TODO: pass to ui decorator decaf componnet
  changeDetectorRef!: ChangeDetectorRef;

  readonly: boolean | FunctionLike = false;

  hidden?: boolean | CrudOperationKeys[] | FunctionLike;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor() {
    super();
  }

  async refresh(...args: unknown[]): Promise<void> {
    this.log.for(this.refresh).debug(`Refresh called with args: ${args}`);
  }

  async preview(...args: unknown[]): Promise<void> {
    this.log.for(this.preview).debug(`Preview called with args: ${args}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async process(...args: unknown[]): Promise<any> {
    this.log.for(this.process).debug(`Process called with args: ${args}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async batchOperation(...args: unknown[]): Promise<any> {
    this.log.for(this.batchOperation).debug(`BatchOperation called with args: ${args}`);
  }
}
