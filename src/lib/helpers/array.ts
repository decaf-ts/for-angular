import { formatDate, isValidDate, parseToValidDate } from "./date";
import { KeyValue } from "../engine/types";

/**
 * Sorts an array of KeyValue objects by their 'createdOn' date property in descending order.
 *
 * @param {KeyValue[]} array - The array of KeyValue objects to be sorted. Defaults to an empty array if not provided.
 * @returns {KeyValue[]} A new array containing the sorted KeyValue objects based on their 'createdOn' date.
 */
export function arraySortByDate(array: KeyValue[] = []): KeyValue[] {
  return array.sort((a: any, b: KeyValue) => {
    if(!a?.['createdOn'] || !b?.['createdOn'] || !parseToValidDate(a?.['createdOn']))
        return a;
    return (parseToValidDate(b?.['createdOn']) as Date).getTime() - (parseToValidDate(a?.['createdOn']) as Date).getTime()
  });
}


/**
 * Filters an array of KeyValue objects based on a search query string.
 * The function performs a case-insensitive search on all values of each object.
 *
 * @param {KeyValue[]} results - The array of KeyValue objects to be filtered.
 * @param {string} query - The search query string to filter the results.
 * @returns {KeyValue[]} A new array containing only the items that match the search query.
 */
export function arrayQueryByString(results: KeyValue[], query: string): KeyValue[] {
  return results.filter((item: KeyValue) =>
    Object.values(item).some(value => value.toString().toLowerCase().includes((query as string)?.toLowerCase()))
  );
}

/**
 * Maps an item object using a provided mapper object and optional additional properties.
 *
 * @param {KeyValue} item - The source object to be mapped.
 * @param {KeyValue} mapper - An object that defines the mapping rules. Keys represent the new property names,
 *                            and values represent the path to the corresponding values in the source object.
 * @param {KeyValue} [props] - Optional additional properties to be included in the mapped object.
 * @returns {KeyValue} A new object with properties mapped according to the mapper object and including any additional properties.
 */
export function itemMapper(item: KeyValue, mapper: KeyValue, props?: KeyValue): KeyValue {
  return Object.entries(mapper).reduce((accum: KeyValue, [key, value]) => {
    const arrayValue = value.split('.');
    if (!value) {
      accum[key] = value;
    } else {
      if (arrayValue.length === 1) {
        accum[key] = item?.[value] || value;
      } else {
        let val;

        for (let _value of arrayValue)
          val = !val
            ? item[_value]
            : (typeof val === 'string' ? JSON.parse(val) : val)[_value];

        if (isValidDate(new Date(val))) val = `${formatDate(val)}`;

        accum[key] = val === null || val === undefined ? value : val;
      }
    }
    return Object.assign({}, props || {}, accum);
  }, {});
}

/**
 * Maps an array of data objects using a provided mapper object.
 *
 * @template T - The type of the resulting mapped items.
 * @param {any[]} data - The array of data objects to be mapped.
 * @param {KeyValue} mapper - An object that defines the mapping rules.
 * @param {KeyValue} [props] - Additional properties to be included in the mapped items.
 *
 * @returns {T[]} - The array of mapped items. If an item in the original array does not have any non-null values after mapping,
 * the original item is returned instead.
 */
export function dataMapper<T>(data: any[], mapper: KeyValue, props?: KeyValue): T[] {
  if (!data || !data.length) return [];
  // consoleInfo(dataMapper, `Mapping data with mapper ${JSON.stringify(mapper)}`);
  return data.reduce((accum: T[], curr) => {
    let item = itemMapper(curr, mapper, props) as T;
    const hasValues =
      [...new Set(Object.values(item as T[]))].filter((value) => value).length >
      0;
    // caso o item filtrado não possua nenhum valor, passar o objeto original
    accum.push(hasValues ? item : curr);
    return accum;
  }, []);
}

