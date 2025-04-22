import { KeyValue } from "../engine/types";
import { formatDate, isValidDate } from "./date";




/**
 * Converts a string representation of a boolean or a boolean value to its boolean equivalent.
 *
 * @param prop - The value to convert. Can be either:
 *               - A string: 'true' or 'false' (case-insensitive)
 *               - A boolean: true or false
 * @returns The boolean representation of the input.
 *          Returns true if the input is the string 'true' (case-insensitive) or the boolean true.
 *          Returns false for all other inputs.
 */
export function stringToBoolean(prop: 'true' | 'false' | boolean): boolean {
  if(typeof prop === 'string')
    prop = prop.toLowerCase() === 'true' ? true : false;
  return prop;
}



/**
 * Converts the first character of a string to uppercase.
 *
 * @param value - The input string to be capitalized. Defaults to an empty string if not provided.
 * @returns A new string with the first character converted to uppercase. If the input string is empty, returns an empty string.
 */
export function stringToCapitalCase(value: string = "") {
  if(!value.length)
    return "";
  return value.charAt(0).toUpperCase() + value.slice(1)
}
