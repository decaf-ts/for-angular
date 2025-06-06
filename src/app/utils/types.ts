import { Adapter, Repository } from "@decaf-ts/core";
import { Context, RepositoryFlags } from "@decaf-ts/db-decorators";
import { Constructor, Model } from "@decaf-ts/decorator-validation";

export type MenuItem = {
  text: string;
  url?: string;
  icon?: string;
};

export type RawQuery<M extends Model> = {
    select: undefined | (keyof M)[];
    from: Constructor<M>;
    where: (el: M) => boolean;
    sort?: (el: M, el2: M) => number;
    limit?: number;
    skip?: number;
};
