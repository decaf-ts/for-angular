import type {
  GraphJsonValue,
  GraphParameterDefinition,
} from '@decaf-ts/ui-decorators/graph';
import type { GraphParameterValueIssue } from './GraphParameterRendererContract';

/**
 * Evaluates a parameter's manifest validation rules plus intrinsic type
 * constraints against the current value, producing structured
 * {@link GraphParameterValueIssue}s (errors block saves; warnings do not).
 */
export function graphParameterValidationIssuesOf(
  parameter: GraphParameterDefinition,
  value: GraphJsonValue | undefined
): GraphParameterValueIssue[] {
  const issues: GraphParameterValueIssue[] = [];
  const validations = parameter.validation ?? [];

  for (const validation of validations) {
    pushValidationIssue(issues, parameter.id, validation, value);
  }

  pushIntrinsicIssues(issues, parameter, value);
  return issues;
}

/** Whether any issue is a blocking (`error`-level) issue. */
export function containsBlockingParameterIssue(
  issues: GraphParameterValueIssue[]
): boolean {
  return issues.some((issue) => issue.level === 'error');
}

function pushValidationIssue(
  issues: GraphParameterValueIssue[],
  parameterId: string,
  validation: NonNullable<GraphParameterDefinition['validation']>[number],
  value: GraphJsonValue | undefined
): void {
  const message = validation.message ?? `Invalid value for "${parameterId}"`;

  switch (validation.kind) {
    case 'required': {
      if (!hasValue(value)) {
        pushError(issues, parameterId, message);
      }
      break;
    }
    case 'min':
    case 'max': {
      const number = numberOrNull(value);
      if (number !== null) {
        if (validation.kind === 'min' && number < validation.value) {
          pushError(issues, parameterId, message);
        }
        if (validation.kind === 'max' && number > validation.value) {
          pushError(issues, parameterId, message);
        }
      }
      break;
    }
    case 'minLength':
    case 'maxLength': {
      const text = stringOrNull(value);
      if (text !== null) {
        if (validation.kind === 'minLength' && text.length < validation.value) {
          pushError(issues, parameterId, message);
        }
        if (validation.kind === 'maxLength' && text.length > validation.value) {
          pushError(issues, parameterId, message);
        }
      }
      break;
    }
    case 'pattern': {
      const text = stringOrNull(value);
      if (value !== undefined && text !== null && !securitySafeRegExpOf(validation.value).test(text)) {
        pushError(issues, parameterId, message);
      }
      break;
    }
    case 'enum': {
      if (value !== undefined && !validation.values.includes(value as string | number | boolean)) {
        pushError(issues, parameterId, message);
      }
      break;
    }
    case 'step': {
      const number = numberOrNull(value);
      if (value === undefined || number === null) break;

      const stepping = Number((number / validation.value).toFixed(10));
      if (!Number.isFinite(stepping) || Math.round(stepping) !== stepping) {
        pushError(issues, parameterId, message);
      }
      break;
    }
    case 'method':
      break;
    default:
      break;
  }
}

function pushIntrinsicIssues(
  issues: GraphParameterValueIssue[],
  parameter: GraphParameterDefinition,
  value: GraphJsonValue | undefined
): void {
  if (value === undefined || value === null) return;

  switch (parameter.type) {
    case 'string': {
      if (typeof value !== 'string') {
        pushError(issues, parameter.id, `Parameter "${parameter.id}" expects a string`);
        break;
      }
      if (parameter.minLength !== undefined && value.length < parameter.minLength) {
        pushError(
          issues,
          parameter.id,
          `Parameter "${parameter.id}" must be at least ${parameter.minLength} characters`
        );
      }
      if (parameter.pattern && !securitySafeRegExpOf(parameter.pattern).test(value)) {
        pushError(issues, parameter.id, `Parameter "${parameter.id}" does not match the expected pattern`);
      }
      break;
    }
    case 'number': {
      const number = numberOrNull(value);
      if (number === null) {
        pushError(issues, parameter.id, `Parameter "${parameter.id}" expects a number`);
        break;
      }
      if (parameter.integer && !Number.isInteger(number)) {
        pushError(issues, parameter.id, `Parameter "${parameter.id}" expects an integer`);
        break;
      }
      if (parameter.min !== undefined && number < parameter.min) {
        pushError(issues, parameter.id, `Parameter "${parameter.id}" must be >= ${parameter.min}`);
        break;
      }
      if (parameter.max !== undefined && number > parameter.max) {
        pushError(issues, parameter.id, `Parameter "${parameter.id}" must be <= ${parameter.max}`);
        break;
      }
      break;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') {
        pushError(issues, parameter.id, `Parameter "${parameter.id}" expects a boolean`);
      }
      break;
    }
    case 'options': {
      if (parameter.multiple) {
        if (!Array.isArray(value)) {
          pushError(issues, parameter.id, `Parameter "${parameter.id}" expects an array of option values`);
          break;
        }
        const wrong = value.find((entry) => typeof entry === 'object' && entry !== null);
        if (wrong !== undefined) {
          pushError(issues, parameter.id, `Parameter "${parameter.id}" option entries must be primitive values`);
          break;
        }
        break;
      }
      if (typeof value === 'object' && !Array.isArray(value)) {
        pushError(issues, parameter.id, `Parameter "${parameter.id}" expects a primitive option value`);
      }
      break;
    }
    case 'resourceLocator': {
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        pushError(issues, parameter.id, `Parameter "${parameter.id}" expects a resource locator object`);
        break;
      }
      const mode = (value as Record<string, unknown>)['mode'];
      if (typeof mode !== 'string' || !parameter.modes.includes(mode as 'list' | 'dynamic')) {
        pushError(issues, parameter.id, `Parameter "${parameter.id}" expects a recognized resource locator mode`);
      }
      break;
    }
    case 'credential': {
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        pushError(issues, parameter.id, `Parameter "${parameter.id}" expects a credential reference object`);
        break;
      }
      const record = value as Record<string, unknown>;
      if (
        typeof record['credentialId'] !== 'string' ||
        typeof record['credentialType'] !== 'string' ||
        record['credentialType'] !== parameter.credentialType
      ) {
        pushError(issues, parameter.id, `Parameter "${parameter.id}" expects a matching credential reference`);
      }
      break;
    }
    default:
      break;
  }
}

function hasValue(value: GraphJsonValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function numberOrNull(value: GraphJsonValue | undefined): number | null {
  if (typeof value === 'number') return value;
  return null;
}

function stringOrNull(value: GraphJsonValue | undefined): string | null {
  if (typeof value === 'string') return value;
  return null;
}

function securitySafeRegExpOf(pattern: string): RegExp {
  let regex: RegExp;
  try {
    regex = new RegExp(pattern);
  } catch {
    regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  }
  return regex;
}

function pushError(
  issues: GraphParameterValueIssue[],
  parameterId: string,
  message: string
): void {
  issues.push({ parameterId, message, level: 'error' });
}
