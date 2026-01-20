import { Comparison, Model } from "@decaf-ts/decorator-validation";
export type Diffs<M, K extends keyof M = keyof M> = Record<
  K,
  {
    old: M[K] | undefined;
    new: M[K] | undefined;
  }
>;

export function toDiffs<M extends Model>(
  comparison: Comparison<M> | undefined
) {
  const diffs = Object.entries(comparison || {}).reduce(
    (acc: Diffs<M>, [key, val]) => {
      acc[key as keyof M] = {
        old: val.other,
        new: val.current,
      };
      return acc;
    },
    {} as Diffs<M>
  );

  return diffs;
}
