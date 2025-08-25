import { BaseCustomEvent } from "../../engine"

export type PaginationCustomEvent = BaseCustomEvent & {
  data: {
    page: number,
    direction: 'next' | 'previous'
  }
}
