import { Class } from "../Class";
import { ChildInterface } from "./ChildInterface";

/**
 * @summary child class summary
 * @description child class description
 *
 * @param {T} arg1 constructor argument description
 * @param {string} [arg2] optional constructor argument description
 *
 * @class ChildClass
 * @extends Class
 * @implements ChildInterface<T>
 *
 * @memberOf module:ts-workspace.Namespace.ChildNameSpace
 */
export class ChildClass<T> extends Class implements ChildInterface<T> {
  /**
   * @summary child class property summary
   * @description child class property description
   *
   * @property {T} [prop]
   *
   * @private
   */
  private prop2?: T;

  constructor(arg1: T, arg2: string) {
    super(arg1, arg2);
    this.prop2 = arg1;
  }

  /**
   * @summary overridden class method summary
   * @description overridden class method description
   *
   * @throws {Error} always
   */
  async method<V>(): Promise<string> {
    return "ok" as unknown as V as unknown as string;
  }

  /**
   * @summary class method summary
   * @description class method description
   *
   * @param {T} arg1
   *
   * @throws {Error} always
   */
  method2(arg1: T): Promise<string> {
    throw new Error("error" + arg1);
  }
}
