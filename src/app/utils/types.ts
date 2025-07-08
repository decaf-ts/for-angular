import { PredefinedColors } from "@ionic/core";
import { Constructor, Model } from "@decaf-ts/decorator-validation";

export interface MenuItem {
  label: string;
  title?: string;
  url?: string;
  icon?: string;
  color?: PredefinedColors;
}

export interface RawQuery<M extends Model> {
    select: undefined | (keyof M)[];
    from: Constructor<M>;
    where: (el: M) => boolean;
    sort?: (el: M, el2: M) => number;
    limit?: number;
    skip?: number;
}
