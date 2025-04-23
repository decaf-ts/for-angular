import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
  Validation,
  ValidationKeys,
  Validator,
} from '@decaf-ts/decorator-validation';
import {
  FieldProperties,
  parseValueByType,
  RenderingEngine,
  HTML5InputTypes
} from '@decaf-ts/ui-decorators';
import { ReservedModels } from '@decaf-ts/decorator-validation';

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
        case ValidationKeys.TYPE:
          arg = RenderingEngine.get().translate(arg as string, false);
      }
      return [arg];
    };

    const validatorFn: ValidatorFn = (
      control: AbstractControl,
    ): ValidationErrors | null => {
      const validator = Validation.get(key) as Validator;

      const value =
        typeof control.value !== 'undefined'
          ? parseValueByType(type === HTML5InputTypes.TEXT ? ReservedModels.STRING : type, control.value, fieldProps)
          : undefined;
      const actualArg = parseArgs(arg);

      let errs;
      try {
        errs = validator.hasErrors(value, { message: '', ...actualArg });
      } catch (e: unknown) {
        console.warn(`${key} validator failed to validate: ${e}`);
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
