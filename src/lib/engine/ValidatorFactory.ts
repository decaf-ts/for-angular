import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
  ModelKeys,
  Validation,
  Validator,
} from '@decaf-ts/decorator-validation';
import { RenderingEngine } from '@decaf-ts/ui-decorators';

export class ValidatorFactory {
  static spawn(key: string, arg: unknown) {
    if (!Validation.keys().includes(key))
      throw new Error('Unsupported custom validation');

    const parseArgs = (arg: unknown) => {
      switch (key) {
        case ModelKeys.TYPE:
          return RenderingEngine.get().translate(arg as string, false);
        default:
          return arg;
      }
    };

    const validatorFn: ValidatorFn = (
      control: AbstractControl,
    ): ValidationErrors | null => {
      const validator = Validation.get(key) as Validator;
      const value = control.value;
      const errs = validator.hasErrors(value, parseArgs(arg));
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
