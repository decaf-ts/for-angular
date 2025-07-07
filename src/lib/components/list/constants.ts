import { Adapter, Repository } from "@decaf-ts/core";
import { Context, RepositoryFlags } from "@decaf-ts/db-decorators";
import { Constructor, Model } from "@decaf-ts/decorator-validation";

export enum ListComponentsTypes {
  INFINITE = 'infinite',
  PAGINATED = 'paginated'
}

export interface IListEmptyResult {
  title: string;
  subtitle: string;
  showButton: boolean;
  buttonText: string;
  link: string;
  icon: string;
}

export interface RawQuery<M extends Model> {
    select: undefined | (keyof M)[];
    from: Constructor<M>;
    where: (el: M) => boolean;
    sort?: (el: M, el2: M) => number;
    limit?: number;
    skip?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DecafRepositoryAdapter = Adapter<Map<string, Map<string | number, any>>, RawQuery<any>, RepositoryFlags & {UUIID?: string}, Context<RepositoryFlags & {UUIID?: string}>>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DecafRepository<M extends Model> = Repository<M, RawQuery<any>, DecafRepositoryAdapter, RepositoryFlags, Context<RepositoryFlags>>;
