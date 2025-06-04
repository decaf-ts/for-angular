import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
  ComparisonValidationKeys,
  DEFAULT_PATTERNS,
  Validation,
  ValidationKeys,
  Validator,
} from '@decaf-ts/decorator-validation';
import { FieldProperties, HTML5InputTypes, parseValueByType } from '@decaf-ts/ui-decorators';
import { AngularEngineKeys } from './constants';

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
  props: Record<string, any>;
} => {
  const patternValidators: Record<string, any> = {
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
      let proxy = {};
      if (Object.values(ComparisonValidationKeys).includes(key as any)) {
        const parent: FormGroup = control instanceof FormGroup ? control : (control as Record<string, any>)[AngularEngineKeys.PARENT];
        proxy = ValidatorFactory.createControlProxy(parent || {});
      }

      let errs: string | undefined;
      try {
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
   * @description
   * This method returns a structured proxy object that simulates a hierarchical tree
   * of form values. It allows validators to traverse up the form tree using
   * a `special` key (e.g., `VALIDATION_PARENT_KEY`), while accessing form values directly by key.
   *
   * When accessing a property (e.g. `proxy['email']`), it returns the corresponding value from the `form`.
   * When accessing the parent (via `VALIDATION_PARENT_KEY`), it returns the parent's value,
   * and includes another `VALIDATION_PARENT_KEY` allowing recursive access up the hierarchy.
   *
   * @param {AbstractControl} control - The control to wrap in a proxy.
   * @returns {Proxy<AbstractControl>} A proxy object exposing form values and enabling recursive parent access.
   *
   * @example
   * const proxy = ValidatorFactory.createControlProxy(control);
   * proxy.email // gets value from current control
   * proxy[VALIDATION_PARENT_KEY].email // gets value from parent
   * proxy[VALIDATION_PARENT_KEY][VALIDATION_PARENT_KEY].email // grandparent, and so on
   */
  static createControlProxy(control: AbstractControl): AbstractControl {
    const self = this;
    return new Proxy(control, {
      get(target, prop) {
        // Intercepts access to the parent property and returns a proxied parent control
        if (prop === AngularEngineKeys.VALIDATION_PARENT_KEY) {
          const parent = (target as Record<string, any>)[AngularEngineKeys.PARENT];
          return parent
            ? {
              ...(parent?.value || {}),
              [AngularEngineKeys.VALIDATION_PARENT_KEY]: self.createControlProxy.call(self, parent[AngularEngineKeys.PARENT] || {}),
            }
            : undefined;
        }

        // Otherwise, return the value from the current control
        return target.value?.[prop];
      },

      set(target, prop, value) {
        throw new Error(`Cannot set property "${String(prop)}" on read-only control proxy`);
      },

      defineProperty(target, prop, descriptor) {
        throw new Error(`Cannot define property "${String(prop)}" on read-only control proxy`);
      },

      deleteProperty(target, prop) {
        throw new Error(`Cannot delete property "${String(prop)}" on read-only control proxy`);
      },
    });
  }
}
