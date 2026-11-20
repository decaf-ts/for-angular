import { compileMathExpr, parseDecimalNumber } from "./safe-math";
import type { GenuiComputed, GenuiSpec } from "./types";

/**
 * @description Evaluate the spec's computed fields against current raw values
 * @summary Parses each raw string variable to a number, then evaluates the
 * computed expressions in declaration order so later fields may reference
 * earlier ones. Expressions that fail to compile or evaluate to a non-finite
 * number are skipped, leaving the field unresolved rather than surfacing an
 * error. Math is delegated to the sandboxed parser in
 * {@link compileMathExpr}; no JavaScript is evaluated.
 * @param {GenuiSpec} spec The spec carrying optional `computed` definitions.
 * @param {Record<string, string>} rawVars Raw field values keyed by field id.
 * @returns {Record<string, number>} Resolved numeric values keyed by computed id.
 * @function
 * @memberOf module:gen-ui
 */
export function evaluateComputed(spec: GenuiSpec, rawVars: Record<string, string>): Record<string, number> {
  const fields = spec.computed ?? [];
  if (fields.length === 0) return {};
  const vars: Record<string, number> = {};
  for (const [name, raw] of Object.entries(rawVars)) {
    const parsed = parseDecimalNumber(raw);
    if (parsed !== undefined) vars[name] = parsed;
  }
  const result: Record<string, number> = {};
  for (const field of fields) {
    const fn = compileMathExpr(field.expr, { vars, allowImplicitVariables: false, allowUnboundVariables: false });
    if (fn === null) continue;
    const value = fn(0);
    if (!Number.isFinite(value)) continue;
    result[field.id] = value;
    vars[field.id] = value;
  }
  return result;
}

function formatterFor(spec: GenuiSpec, id: string): GenuiComputed | undefined {
  return (spec.computed ?? []).find((field) => field.id === id);
}

/**
 * @description Format a resolved computed value using its declared format
 * @summary Applies `Intl.NumberFormat` with the field's locale, style,
 * currency, and fraction-digit settings. A missing definition or an invalid
 * format configuration falls back to the plain string form of the number.
 * @param {number} value The resolved numeric value.
 * @param {GenuiSpec} spec The spec carrying the computed definitions.
 * @param {string} id The computed field id whose format to use.
 * @returns {string} The display string.
 * @function
 * @memberOf module:gen-ui
 */
export function formatComputedValue(value: number, spec: GenuiSpec, id: string): string {
  const definition = formatterFor(spec, id);
  const format = definition?.format;
  if (format === undefined) return String(value);
  try {
    return new Intl.NumberFormat(format.locale, {
      style: format.style ?? "decimal",
      ...(format.currency === undefined ? {} : { currency: format.currency }),
      ...(format.minimumFractionDigits === undefined
        ? {}
        : { minimumFractionDigits: format.minimumFractionDigits }),
      ...(format.maximumFractionDigits === undefined
        ? {}
        : { maximumFractionDigits: format.maximumFractionDigits }),
    }).format(value);
  } catch {
    return String(value);
  }
}
