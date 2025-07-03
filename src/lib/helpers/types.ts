/**
 * @typeDef Err
 * @memberOf engine.types
 *
 */
export type Err = Error | undefined | null;

/**
 * @typeDef Callback
 * @memberOf utils.types
 *
 */
export type Callback = (err?: Err, ...args: any[]) => void;

/**
 * @typeDef FunctionType
 * @memberOf utils.types
 *
 */
export type FunctionType = (...args: any[]) => any;
