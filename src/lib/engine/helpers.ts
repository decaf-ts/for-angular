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
