import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
  ComparisonValidationKeys,
  DEFAULT_PATTERNS,
  PathProxy,
  PathProxyEngine,
  Primitives,
  Validation,
  ValidationKeys,
  Validator,
} from '@decaf-ts/decorator-validation';
import { FieldProperties, HTML5InputTypes, parseValueByType } from '@decaf-ts/ui-decorators';
import { AngularEngineKeys } from './constants';
import { KeyValue } from './types';

type ComparisonValidationKey = typeof ComparisonValidationKeys[keyof typeof ComparisonValidationKeys];

/**
 *
 * Resolves the correct validator key and its associated properties based on the input key and type.
 *
 * When the validation key is TYPE, it's necessary to resolve the actual validator based on the
 * field's type (e.g., 'password', 'email', 'url') instead of using the generic getValidator("type") logic.
 * This allows directly invoking specific validators like getValidator('password'), ensuring the correct
 * behavior for type-based validation.
 *
 * @param key - The validation key (e.g., 'type', 'required', etc.).
 * @param value - The value that needs be provided to the validator.
 * @param type - The field's declared type.
 * @returns An object containing the resolved validator key and its corresponding props.
 */
const resolveValidatorKeyProps = (key: string, value: unknown, type: string): {
  validatorKey: string;
  props: Record<string, unknown>;
} => {
  const patternValidators: Record<string, unknown> = {
    [ValidationKeys.PASSWORD]: DEFAULT_PATTERNS.PASSWORD.CHAR8_ONE_OF_EACH,
    [ValidationKeys.EMAIL]: DEFAULT_PATTERNS.EMAIL,
    [ValidationKeys.URL]: DEFAULT_PATTERNS.URL,
  };

  const isTypeBased = key === ValidationKeys.TYPE && Object.keys(patternValidators).includes(type);
  const validatorKey = isTypeBased ? type : key;
  const props: Record<string, unknown> = {
    [validatorKey]: value,
    // Email, Password, and URL are validated using the "pattern" key
    ...(isTypeBased && { [ValidationKeys.PATTERN]: patternValidators[type] }),
  };

  return { validatorKey, props };
};


export class ValidatorFactory {
  static spawn(fieldProps: FieldProperties, key: string): ValidatorFn {
    if (!Validation.keys().includes(key))
      throw new Error('Unsupported custom validation');

    const validatorFn: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
      const { name, type } = fieldProps;
      const { validatorKey, props } = resolveValidatorKeyProps(key, fieldProps[key as keyof FieldProperties], type);
      const validator = Validation.get(validatorKey) as Validator;

      // parseValueByType does not support undefined values
      const value = typeof control.value !== 'undefined'
        ? parseValueByType(type, type === HTML5InputTypes.CHECKBOX ? name : control.value, fieldProps)
        : undefined;

      // Create a proxy to enable access to parent and child values
      let proxy: PathProxy<unknown> = ValidatorFactory.createProxy({} as AbstractControl);
      if (Object.values(ComparisonValidationKeys).includes(key as ComparisonValidationKey)) {
        const parent: FormGroup = control instanceof FormGroup ? control : (control as KeyValue)[AngularEngineKeys.PARENT];
        proxy = ValidatorFactory.createProxy(parent) as PathProxy<unknown>;
      }

      let errs: string | undefined;
      try {
        if(!props['types'] && !props['customTypes'])
          props['types'] = props['type'] === 'text' ? Primitives.STRING : type;
        errs = validator.hasErrors(value, props, proxy);
      } catch (e: unknown) {
        errs = `${key} validator failed to validate: ${e}`;
        console.warn(errs);
      }

      return errs ? { [validatorKey]: true } : null;
    };

    Object.defineProperty(validatorFn, 'name', {
      value: `${key}Validator`,
    });

    return validatorFn;
  }

  /**
   * @summary Creates a proxy wrapper for an Angular AbstractControl to assist with custom validation logic.
   * @description Returns a structured proxy object that simulates a hierarchical tree of form values.
   * Enables Validators handling method to access parent and child properties using consistent dot-notation in Angular forms.
   *
   * @param {AbstractControl} control - The control to wrap in a proxy.
   * @returns {PathProxy<unknown>} A proxy object exposing form values and enabling recursive parent access.
   */
  static createProxy(control: AbstractControl): PathProxy<unknown> {
    return PathProxyEngine.create(control, {
      getValue(target: AbstractControl, prop: string): unknown {
        if (target instanceof FormControl)
          return target.value;

        if (target instanceof FormGroup) {
          const control = target.controls[prop];
          return control instanceof FormControl ? control.value : control;
        }

        // const value = target[prop];
        // if (value instanceof FormControl)
        //   return value.value;
        //
        // if (value instanceof FormGroup) {
        //   const control = value.controls[prop];
        //   return control instanceof FormControl ? control.value : control;
        // }

        return (target as KeyValue)?.[prop];
      },
      getParent: function(target: AbstractControl)  {
        return target?.['_parent'];
      },
      ignoreUndefined: true,
      ignoreNull: true,
    });
  }
}
