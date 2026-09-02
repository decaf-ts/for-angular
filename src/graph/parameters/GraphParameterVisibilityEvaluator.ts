import type {
  GraphJsonPrimitive,
  GraphJsonValue,
  GraphParameterDefinition,
  GraphVisibilityExpression,
} from '@decaf-ts/ui-decorators/graph';

/** Parameter values keyed by parameter id, as consumed by visibility expressions. */
export type GraphParameterValues = Record<string, GraphJsonValue | undefined>;

/**
 * Evaluates a parameter's visibility expression (§4.6) against the current
 * parameter values: comparisons (`eq`/`neq`/`gt`/`gte`/`lt`/`lte`), `in`/`nin`
 * sets, and `and`/`or`/`not` combinators. Omitted expressions are visible.
 */
export function graphParameterVisibilityOf(
  visibility: GraphVisibilityExpression | undefined,
  values: GraphParameterValues
): boolean {
  if (!visibility) return true;
  return evaluateVisibility(visibility, values);
}

function evaluateVisibility(
  visibility: GraphVisibilityExpression,
  values: GraphParameterValues
): boolean {
  switch (visibility.op) {
    case 'eq':
    case 'neq':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return evaluateComparison(visibility.op, values[visibility.parameter], visibility.value);
    case 'in':
    case 'notIn':
      return evaluateMembership(
        visibility.op,
        values[visibility.parameter],
        visibility.values
      );
    case 'exists':
      return values[visibility.parameter] !== undefined;
    case 'and':
      return visibility.expressions.every((entry) => evaluateVisibility(entry, values));
    case 'or':
      return visibility.expressions.some((entry) => evaluateVisibility(entry, values));
    case 'not':
      return !evaluateVisibility(visibility.expression, values);
    default:
      return false;
  }
}

function evaluateComparison(
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte',
  left: GraphJsonValue | undefined,
  right: GraphJsonPrimitive
): boolean {
  if (typeof left === 'object' || left === undefined) return false;
  switch (op) {
    case 'eq':
      return left === right;
    case 'neq':
      return left !== right;
    case 'gt':
      return compareOrdered(left, right) > 0;
    case 'gte':
      return compareOrdered(left, right) >= 0;
    case 'lt':
      return compareOrdered(left, right) < 0;
    case 'lte':
      return compareOrdered(left, right) <= 0;
  }
}

function compareOrdered(left: Exclude<GraphJsonValue, object>, right: GraphJsonPrimitive): number {
  if (typeof left === 'string' && typeof right === 'string') {
    return left.localeCompare(right);
  }
  if (typeof left === 'string' || typeof right === 'string') return NaN;
  if (typeof left === 'boolean' || typeof right === 'boolean') {
    return Number(left) - Number(right);
  }
  if (left === null || right === null) return NaN;
  return (left as number) - (right as number);
}

function evaluateMembership(
  op: 'in' | 'notIn',
  left: GraphJsonValue | undefined,
  values: GraphJsonPrimitive[]
): boolean {
  if (typeof left === 'object' || left === undefined) return false;
  return op === 'in' ? values.includes(left as GraphJsonPrimitive) : !values.includes(left as GraphJsonPrimitive);
}

/** Returns the ids of parameters whose visibility expressions currently hold. */
export function graphParameterVisibleParameterIdsOf(
  parameters: GraphParameterDefinition[],
  values: GraphParameterValues
): string[] {
  return parameters
    .filter((parameter) => graphParameterVisibilityOf(parameter.visibility, values))
    .map((parameter) => parameter.id);
}
