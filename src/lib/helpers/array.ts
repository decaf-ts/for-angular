import { parseToValidDate } from "./date";
import { KeyValue } from "../engine/types";

export function arraySortByDate(array: KeyValue[] = []): KeyValue[] {
  return array.sort((a: any, b: KeyValue) => {
    if(!a?.['createdOn'] || !b?.['createdOn'] || !parseToValidDate(a?.['createdOn']))
        return a;
    return (parseToValidDate(b?.['createdOn']) as Date).getTime() - (parseToValidDate(a?.['createdOn']) as Date).getTime()
  });
}


export function arrayQueryByString(results: KeyValue[], query: string) {
  return results.filter((item: KeyValue) =>
    Object.values(item).some(value => value.toString().toLowerCase().includes((query as string)?.toLowerCase()))
  );
}
