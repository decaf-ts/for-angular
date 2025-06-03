import { BaseCustomEvent } from "src/lib/engine"

export type PaginationCustomEvent = BaseCustomEvent & {
  data: {
    page: number,
    direction: 'next' | 'previous'
  }
}
