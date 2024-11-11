/**
 * @summary Interface summary
 * @description Interface description
 *
 * @interface Interface
 *
 * @memberOf module:ts-workspace.Namespace
 */
export interface Interface {
  /**
   * @summary Interface method summary
   * @description Interface method description
   *
   * @param {T} arg1
   */
  method<T>(arg1: T): Promise<string>;
}
