import { Constructor, Metadata } from "@decaf-ts/decoration";
import { InternalError } from "@decaf-ts/db-decorators";
import { Model, ModelArg } from "@decaf-ts/decorator-validation";
import { FabricIdentifiedModel} from "./FabricIdentifiedModel";
export enum PTPKeys {
  MSP_ID = "ptp",
  CACHE = "cache",
}

export function toCache<M extends Cacheable, S extends boolean>(
  model: M,
  stringify: S = true as S
): S extends false ? Record<any, any> : string {
  const cacheableProps: Record<keyof M, any> = Metadata.get(
    model.constructor as Constructor,
    PTPKeys.CACHE
  );
  if (!cacheableProps)
    throw new InternalError("No cacheable properties defined for this model.");
  try {
    const cacheData: Record<keyof M, any> = {} as any;
    for (const key of Object.keys(cacheableProps) as (keyof M)[]) {
      if (
        (model[key] as any) instanceof Model &&
        (model[key] as ICacheable).toCache
      ) {
        cacheData[key] = (model[key] as ICacheable).toCache();
      } else if (
        Array.isArray(model[key]) &&
        model[key].length &&
        model[key].every(
          (m) => m instanceof Model && (m as unknown as ICacheable).toCache
        )
      ) {
        cacheData[key] = (model[key] as unknown as ICacheable[]).map((m) =>
          m.toCache()
        );
      } else cacheData[key] = model[key];
    }
    return (stringify ? JSON.stringify(cacheData) : cacheData) as any;
  } catch (error: any) {
    throw new InternalError(
      `Failed to serialize cacheable properties: ${error.message}`
    );
  }
}

export interface ICacheable {
  toCache<S extends boolean>(
    stringify?: S
  ): S extends false ? Record<any, any> : string;
}

export abstract class Cacheable
  extends FabricIdentifiedModel
  implements ICacheable
{
  constructor(model?: ModelArg<Cacheable>) {
    super(model);
  }
  toCache<S extends boolean>(
    stringify?: S
  ): S extends false ? Record<any, any> : string {
    return toCache(this, stringify);
  }
}
