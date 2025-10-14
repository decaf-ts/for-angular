import { LoggedClass } from '@decaf-ts/logging';

export abstract class BaseWebComponent extends LoggedClass {
  protected override get log(): Logger {
    return super.log;
  }
}
