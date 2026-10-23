/**
 * @module utils/structured-output
 * @description Shared, dependency-free helpers for the S1 structured-output
 * definition shape used by the model-builder and the graph editor.
 */

/**
 * Parses a persisted structured-output definition (SAA-836 S1 shape:
 * `{ model, instructions?, jsonPromptInjection?, providerOptions? }`) from an
 * object or its JSON-stringified form. Non-definition shapes return `null`.
 */
export function modelBuilderStructuredDefinitionOf(value: unknown): Record<string, unknown> | null {
  let candidate = value;
  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const record = candidate as Record<string, unknown>;
  if (typeof record['model'] !== 'string' || !record['model'].trim()) return null;
  return record;
}
