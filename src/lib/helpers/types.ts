import { AxiosError } from "axios";
import { KeyValue } from "../engine";

/**
 * @typeDef LoggerLevelTypes
 * @memberOf engine.types
 */
export type LoggerLevelTypes = "log" | "info" | "warn" | "error" | "debug"

/**
 * @typeDef LoggerMessage
 * @memberOf engine.types
 */
export type LoggerMessage = Error & {loggedAt?: number} | AxiosError & {loggedAt?: number} | string | KeyValue | KeyValue[];

/**
 * @typeDef Err
 * @memberOf engine.types
 *
 */
export type Err = Error  | undefined | null;


/**
 * @typeDef Callback
 * @memberOf utils.types
 *
 */
export type Callback = (err?: Err, ...args: any[]) => void;
