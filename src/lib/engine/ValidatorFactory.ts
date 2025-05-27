import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
  Validation,
  ValidationKeys,
  Validator,
  DEFAULT_PATTERNS
} from '@decaf-ts/decorator-validation';
import {
  FieldProperties,
  parseValueByType,
  RenderingEngine,
  HTML5InputTypes
} from '@decaf-ts/ui-decorators';
import { consoleWarn } from '../helpers';

export class ValidatorFactory {
  static spawn(fieldProps: FieldProperties, key: string): ValidatorFn {
    if (!Validation.keys().includes(key))
      throw new Error('Unsupported custom validation');
    const arg = fieldProps[key as keyof FieldProperties];
    const type = fieldProps.type;
    /**
     * TODO: This is only needed until the validator refacture
     * @param arg
     */
    const parseArgs = (arg: unknown) => {
      switch (key) {
        case ValidationKeys.REQUIRED:
        case ValidationKeys.EMAIL:
        case ValidationKeys.URL:
        case ValidationKeys.PASSWORD:
          return [];
        case ValidationKeys.TYPE: {
          arg = RenderingEngine.get().translate(arg as string, false);
          break;
        }
        case ValidationKeys.MIN:
        case ValidationKeys.MAX:
          return {[key]: arg}
      }
      return [arg];
    };

    const getValidatiorKey = (key: string, type: string): string => {
      if([ValidationKeys.PASSWORD as string, ValidationKeys.EMAIL as string, ValidationKeys.URL as string].includes(type))
        return type as string;
      return key;
    }

    const validatorFn: ValidatorFn = (
      control: AbstractControl,
    ): ValidationErrors | null => {
      key = getValidatiorKey(key, type);
      const validator = Validation.get(key) as Validator;
      const value =
        typeof control.value !== 'undefined'
          ? parseValueByType(type, type === HTML5InputTypes.CHECKBOX ? fieldProps.name : control.value, fieldProps)
          : undefined;
      const actualArg = parseArgs(arg);
      let errs;
      try {
        const props = {[key]: fieldProps[key as keyof FieldProperties]};
        if(key === ValidationKeys.PASSWORD)
          Object.assign(props, {pattern: ValidationKeys.PASSWORD})
        errs = validator.hasErrors(value,  props);
      } catch (e: unknown) {
        consoleWarn(this, `${key} validator failed to validate: ${e}`);
      }
      if (!errs) return null;
      const result: Record<string, boolean> = {};
      result[key] = true;
      return result;
    };

    Object.defineProperty(validatorFn, 'name', {
      value: `${key}Validator`,
    });

    return validatorFn;
  }
}
