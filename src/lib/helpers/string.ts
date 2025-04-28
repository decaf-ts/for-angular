import { KeyValue } from "../engine/types";
import { formatDate, isValidDate } from "./date";



/**
 * Converts a string representation of a boolean or a boolean value to a boolean type.
 *
 * @export
 * @param {('true' | 'false' | boolean)} prop - The value to convert. Can be the string 'true', 'false', or a boolean.
 * @returns {boolean} The boolean representation of the input value. Returns true if the input is the string 'true' or boolean true, false otherwise.
 */
export function stringToBoolean(prop: 'true' | 'false' | boolean): boolean {
  if(typeof prop === 'string')
    prop = prop.toLowerCase() === 'true' ? true : false;
  return prop;
}


/**
 * Converts a string to capital case by capitalizing the first letter and keeping the rest unchanged.
 *
 * @export
 * @param {string} value - The string to convert to capital case. Defaults to an empty string.
 * @returns {string} The string with the first letter capitalized. Returns an empty string if the input is empty.
 */
export function stringToCapitalCase(value: string = "") {
  if(!value.length)
    return "";
  return value.charAt(0).toUpperCase() + value.slice(1)
}
