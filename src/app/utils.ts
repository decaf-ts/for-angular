/**
 * @description Utility functions for form field generation and data mocking.
 * @summary This module provides utility functions for creating form field properties
 * and generating mock data using Faker. These utilities help streamline the creation
 * of form fields with consistent properties and the generation of realistic test data
 * for development and testing purposes.
 *
 * @module AppUtils
 */

import { KeyValue } from 'src/lib/engine/types';
import { formatDate } from 'src/lib/helpers/utils';

/**
 * @description Common properties for input fields.
 * @summary Defines a set of default properties that are commonly used across
 * different types of input fields. These properties include basic attributes like
 * name, label, and placeholder, as well as validation properties like required.
 * Additional validation properties are commented out but available for use when needed.
 *
 * @private
 * @type {Object}
 */
const commonInputProps = {
  name: 'field-name',
  label: 'field label',
  placeholder: 'field placeholder',
  type: 'text',
  hidden: false,
  // Validation
  required: true,
  // readonly: false,
  // maxLength: number;
  // minLength?: number;
  // max?: number | Date;
  // min?: number | Date;
  // pattern?: string;
  // step?: number;
  // custom?: string[];
};

/**
 * @description Generates properties for a form field.
 * @summary Creates a set of properties for a form field by combining common input properties
 * with specific properties for the given field. This function is used to quickly generate
 * consistent field configurations for forms, reducing repetitive code and ensuring
 * that all fields follow the same structure.
 *
 * @param {string} name - The name identifier for the field
 * @param {string} [type='text'] - The input type (e.g., 'text', 'number', 'date')
 * @param {string | number | Date} [value=''] - The initial value for the field
 * @return {Object} An object containing all the properties for the form field
 *
 * @mermaid
 * sequenceDiagram
 *   participant C as Component
 *   participant U as Utils
 *   participant O as Object
 *
 *   C->>U: getFormFieldProps(name, type, value)
 *   U->>O: Object.assign({}, commonInputProps, {...})
 *   O-->>U: Return combined properties object
 *   U-->>C: Return form field properties
 *
 * @memberOf AppUtils
 */
export function getFormFieldProps(
  name: string,
  type = 'text',
  value: string | number | Date = ''
): {} {
  return Object.assign({}, commonInputProps, {
    name: `field-${name}`,
    label: `Label for field ${name}`,
    placeholder: `placeholder for field ${type}`,
    type: type,
    value: value,
  });
}

/**
 * @description Generates mock data using Faker functions.
 * @summary Creates an array of mock data objects using provided Faker functions.
 * This utility is particularly useful for generating realistic test data for
 * development, testing, and demonstrations. It handles special cases like Date objects
 * by formatting them appropriately.
 *
 * @param {number} [limit=100] - The number of data items to generate
 * @param {Record<string, Function>} fakerObj - An object mapping field names to Faker functions
 * @return {Promise<KeyValue[]>} A promise that resolves to an array of generated data objects
 *
 * @mermaid
 * sequenceDiagram
 *   participant C as Component
 *   participant U as Utils
 *   participant F as Faker
 *
 *   C->>U: generateFakerData(limit, fakerObj)
 *   U->>U: Create new Promise
 *   U->>U: Generate array of length 'limit'
 *   loop For each item in array
 *     U->>U: Create empty item object
 *     loop For each key-value in fakerObj
 *       U->>F: Execute faker function
 *       F-->>U: Return generated value
 *       alt Value is Date
 *         U->>U: Format date value
 *       end
 *       U->>U: Add to item object
 *     end
 *     U->>U: Add item to result array
 *   end
 *   U-->>C: Resolve with array of generated items
 *
 * @memberOf AppUtils
 */
export function generateFakerData(
  limit: number = 100,
  props: Record<string, Function>
): Promise<KeyValue[]> {
  return new Promise((resolve) => {
    return resolve(
      Array.from({ length: limit }, () => {
        const item: Record<string, any> = {};
        for (const [key, value] of Object.entries(props)) {
          const val = value();
          item[key] = val.constructor === Date ? formatDate(val) : val;
        }
        return item;
      })
    );
  });
}
