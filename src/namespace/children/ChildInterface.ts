/**
 * @summary Interface summary
 * @description Interface description
 * @category Namespace
 */
import { Interface } from "../Interface";
/**
 * @summary Interface summary
 * @description Interface description
 *
 * @typedef T
 *
 * @interface ChildInterface
 * @extends Interface
 *
 * @memberOf module:ts-workspace.Namespace.ChildNameSpace
 */
export interface ChildInterface<T> extends Interface {
  /**
   * @summary Interface method summary
   * @description Interface method description
   *
   * @param {T} arg1
   */
  method2(arg1: T): Promise<string>;
}
