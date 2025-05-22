import { Primitives } from "@decaf-ts/decorator-validation";
import { consoleWarn } from "./logging";
import { getLocaleLanguage } from "./utils";


/**
 * Checks if a value is a valid Date object
 *
 * @param {(string | Date | number)} date - The value to check. Can be a Date object, a timestamp number, or a date string
 * @return {boolean} Returns true if the value is a valid Date object (not NaN), otherwise false
 */
export function isValidDate(date: string | Date | number): boolean {
  try {
    return (date instanceof Date && !isNaN(date as any)) || (() => {
      const testRegex = new RegExp(/^\d{4}-\d{2}-\d{2}$/).test(date as string)
      if(typeof date !== Primitives.STRING || !(date as string)?.includes('T') && !testRegex)
         return false;

     date = (date as string).split('T')[0];
    if(!new RegExp(/^\d{4}-\d{2}-\d{2}$/).test(date))
      return false;

    return !!(new Date(date));
   })();
  } catch(e) {
    return false;
  }
}

/**
 * Formats a date into a localized string representation
 *
 * @param {(string | Date | number)} date - The date to format. Can be a Date object, a timestamp number, or a date string
 * @param {string} [locale] - The locale to use for formatting. If not provided, the system's locale will be used
 * @return {(Date | string)} A formatted date string in the format DD/MM/YYYY according to the specified locale,
 *                           or the original input as a string if the date is invalid
 */
export function formatDate(date: string | Date | number, locale?: string | undefined): Date | string {

  if(!locale)
    locale = getLocaleLanguage();

  if(typeof date === 'string' || typeof date === 'number')
    date = new Date(typeof date === 'string' ? date.replace(/\//g, '-') : date);

  if(!isValidDate(date))
    return `${date}` as string;
  const r = date.toLocaleString(locale, {
      year: "numeric",
      day: "2-digit",
      month: '2-digit'
  });


  return r;
}

/**
 * Attempts to parse a date string, Date object, or number into a valid Date object
 *
 * @param {(string | Date | number)} date - The date to parse. Can be a Date object, a timestamp number,
 *                                         or a date string in the format "DD/MM/YYYY HH:MM:SS:MS"
 * @return {(Date | null)} A valid Date object if parsing is successful, or null if the date is invalid
 *                         or doesn't match the expected format
 */
export function parseToValidDate(date: string | Date | number): Date | null {
  if(isValidDate(date))
    return date as Date;

  if(!`${date}`.includes('/'))
    return null;

  const [dateString, timeString] = (date as string).split(' ');
  const [day, month, year] = dateString.split('/').map(Number);
  const [hours, minutes, seconds, milliseconds] = timeString.split(':').map(Number);
  date = new Date(year, month - 1, day, hours, minutes, seconds, milliseconds);

  if(!isValidDate(date)) {
    consoleWarn('parseToValidDate', 'Invalid date format', date);
    return null;
  }

  return date;
}
