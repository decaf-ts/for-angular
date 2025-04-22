import { consoleWarn } from "./logging";
import { getLocaleLanguage } from "./utils";

export function isValidDate(date: string | Date | number) {
  return date instanceof Date && !isNaN(date as any);
}

export function formatDate(date: string | Date | number, locale?: string | undefined) {

  if(!locale)
    locale = getLocaleLanguage();

  if(!isValidDate(date))
    return `${date}` as string;

  if(typeof date === 'string' || typeof date === 'number')
    date = new Date(date);

  return date.toLocaleString(locale, {
      year: "numeric",
      day: "2-digit",
      month: '2-digit'
  });
}

export function parseToValidDate(date: string | Date | number) {
  if(isValidDate(date))
    return date;
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
