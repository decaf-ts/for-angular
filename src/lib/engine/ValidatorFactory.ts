import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ComparisonValidationKeys, Validation, ValidationKeys, Validator } from '@decaf-ts/decorator-validation';
import { FieldProperties, HTML5InputTypes, parseValueByType } from '@decaf-ts/ui-decorators';
import { AngularEngineKeys } from './constants';

export class ValidatorFactory {
  static spawn(fieldProps: FieldProperties, key: string): ValidatorFn {
    if (!Validation.keys().includes(key))
      throw new Error('Unsupported custom validation');
    //  TODO: This is only needed until the validator refacture
    //  @param arg
    // const parseArgs = (arg: unknown) => {
    //   switch (key) {
    //     case ValidationKeys.REQUIRED:
    //     case ValidationKeys.EMAIL:
    //     case ValidationKeys.URL:
    //     case ValidationKeys.PASSWORD:
    //       return [];
    //     case ValidationKeys.TYPE: {
    //       arg = RenderingEngine.get().translate(arg as string, false);
    //       break;
    //     }
    //     case ValidationKeys.MIN:
    //     case ValidationKeys.MAX:
    //       return {[key]: arg}
    //   }
    //   return [arg];
    // };

    const getValidatorKey = (key: string, type: string): string => {
      if ([ValidationKeys.PASSWORD as string, ValidationKeys.EMAIL as string, ValidationKeys.URL as string].includes(type))
        return type as string;
      return key;
    };

    const validatorFn: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
      const { name, type } = fieldProps;
      key = getValidatorKey(key, type);
      const validator = Validation.get(key) as Validator;
      // parseValueByType does not support undefined values
      const value = typeof control.value !== 'undefined'
        ? parseValueByType(type, type === HTML5InputTypes.CHECKBOX ? name : control.value, fieldProps)
        : undefined;

      // arg = RenderingEngine.get().translate(arg as string, false);
      // const actualArg = parseArgs(arg);

      let proxy = {};
      if (Object.values(ComparisonValidationKeys).includes(key as any)) {
        const parent: FormGroup = control instanceof FormGroup ? control : (control as Record<string, any>)[AngularEngineKeys.PARENT];
        proxy = ValidatorFactory.createControlProxy(parent || {});
      }

      let errs: string | undefined;
      try {
        const props = { [key]: fieldProps[key as keyof FieldProperties] };
        if (key === ValidationKeys.PASSWORD)
          Object.assign(props, { pattern: ValidationKeys.PASSWORD });
        errs = validator.hasErrors(value, props, proxy);
      } catch (e: unknown) {
        errs = `${key} validator failed to validate: ${e}`;
        console.warn(errs);
      }

      return errs ? { [key]: true } : null;
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
              ...parent.value,
              [AngularEngineKeys.VALIDATION_PARENT_KEY]: self.createControlProxy.call(self, parent[AngularEngineKeys.PARENT]),
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
