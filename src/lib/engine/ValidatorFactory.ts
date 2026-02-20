/**
 * @module module:lib/engine/ValidatorFactory
 * @description Factory for generating Angular ValidatorFn from Decaf validation metadata.
 * @summary ValidatorFactory maps validation keys defined by the Decaf validation system
 * into Angular ValidatorFn instances. It supports type-based resolution and comparison
 * validators and provides helpers to create proxies for nested control validation.
 *
 * @link {@link ValidatorFactory}
 */
import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
  ComparisonValidationKeys,
  PathProxy,
  PathProxyEngine,
  Primitives,
  Validation,
  ValidationKeys,
  Validator,
} from '@decaf-ts/decorator-validation';
import { FieldProperties, HTML5InputTypes, parseValueByType, UIKeys } from '@decaf-ts/ui-decorators';
import { patternValidators } from './constants';
import { getLogger } from './helpers';
import { NgxRenderingEngine } from './NgxRenderingEngine';
import { ComparisonValidationKey, KeyValue } from './types';

export class ValidatorFactory {
  /**
   * @summary Extracts and parses the value from an Angular control.
   * @description Retrieves the control's value and converts it to the appropriate type based on field properties.
   * Handles undefined values gracefully by returning undefined without parsing.
   *
   * @param {AbstractControl} control - The Angular form control to extract the value from.
   * @param {string} fieldType - The declared type of the field.
   * @param {FieldProperties} fieldProps - The field properties containing type conversion metadata.
   * @returns {unknown} The parsed value or undefined if the control value is undefined.
   */
  static getFieldValue(control: AbstractControl, fieldType: string, fieldProps: FieldProperties): unknown {
    return typeof control.value !== 'undefined' ? parseValueByType(fieldType, control.value, fieldProps) : undefined;
  }
  /**
   * @summary Resolves the effective field type from multiple possible type sources.
   * @description Determines the field's type by checking customTypes, subType, or type in order of priority.
   * For checkbox and array fields with options, converts the type to STRING for proper validation.
   *
   * @param {string} [type] - The primary field type.
   * @param {string | string[]} [customTypes] - Custom type definition with highest priority.
   * @param {unknown[]} [options] - Available options for the field (affects checkbox/array handling).
   * @param {string} [subType] - Secondary type definition.
   * @returns {string} The resolved field type.
   */
  static getFieldType(type?: string, customTypes?: string | string[], options?: unknown[], subType?: string): string {
    const fieldType = (customTypes || subType || type) as string;
    if ((fieldType === HTML5InputTypes.CHECKBOX || fieldType === Array.name) && Array.isArray(options)) {
      return Primitives.STRING;
    }
    return fieldType;
  }

  /**
   * @summary Creates a ValidatorFn for a specific validation key.
   * @description Generates an Angular ValidatorFn that applies Decaf validation logic to a form control.
   * Resolves the appropriate validator based on field type, parses the control value, constructs validation properties,
   * and handles comparison validators through proxy access to parent/child form values.
   *
   * @param {FieldProperties} fieldProps - The field properties containing type and validation metadata.
   * @param {string} key - The validation key to create a validator for.
   * @returns {ValidatorFn} A validator function that returns ValidationErrors or null.
   * @throws {Error} If the validation key is not supported.
   */
  static spawn(fieldProps: FieldProperties, key: string): ValidatorFn {
    if (!Validation.keys().includes(key)) {
      throw new Error('Unsupported custom validation');
    }
    const validatorFn: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
      const { type, customTypes, options, subType } = fieldProps || {};
      const fieldType = ValidatorFactory.getFieldType(type, customTypes, options, subType);
      const customValidator = key === UIKeys.TYPE && subType;
      const { validatorKey, props } = this.resolveValidatorKeyProps(
        key,
        fieldType,
        fieldProps,
        customValidator ? (subType as string) : undefined
      );
      const validator = Validation.get(validatorKey) as Validator;
      // parseValueByType does not support undefined values
      const value = ValidatorFactory.getFieldValue(control, fieldType, fieldProps);
      // Create a proxy to enable access to parent and child values
      const proxy = ValidatorFactory.getValidatorProxy(control, key as ComparisonValidationKey);
      let errs: string | undefined;
      try {
        const validationMessage = fieldProps?.validationMessage;
        if (validationMessage && customValidator) {
          Object.assign(props, { message: validationMessage });
        }
        errs = validator.hasErrors(value, props, proxy);
      } catch (e: unknown) {
        errs = `${key} validator failed to validate: ${e}`;
        getLogger(ValidatorFactory).error(errs);
      }
      return errs ? { [validatorKey]: props?.['message'] ? errs : true } : null;
    };

    Object.defineProperty(validatorFn, 'name', {
      value: `${key}Validator`,
    });

    return validatorFn;
  }

  /**
   * Retrieves the validator value from field properties, with special handling for checkbox types.
   * Returns the field property value, or the type if the field is a checkbox and the types differ.
   *
   * @param key - The validation key.
   * @param type - The field's type.
   * @param fieldProps - The field properties object.
   * @returns The validator value to use.
   */
  static getValidatorValue(key: string, type: string, fieldProps: FieldProperties): unknown {
    return key === ValidationKeys.TYPE && HTML5InputTypes.CHECKBOX && fieldProps[key as keyof FieldProperties] !== type
      ? type
      : fieldProps[key as keyof FieldProperties];
  }

  /**
   * Determines whether a validation should be resolved based on the field's type.
   * Returns true for TYPE validations with custom types or pattern-based validators.
   *
   * @param key - The validation key to evaluate.
   * @param type - The field's declared type.
   * @param customTypes - Optional custom type definition.
   * @returns True if validation should use type-based resolution.
   */
  static isTypeBasedValidation(key: string, type: string, customTypes: string | undefined): boolean {
    return (
      key === ValidationKeys.TYPE &&
      ((typeof customTypes === Primitives.STRING && HTML5InputTypes.TEXT !== customTypes) ||
        Object.keys(patternValidators).includes(type))
    );
  }

  /**
   * @summary Creates or retrieves a proxy for validator access to parent/child form values.
   * @description Returns a PathProxy configured for the given validation key.
   * For comparison validators, creates a proxy rooted at the parent FormGroup to enable cross-field validation.
   * For other validators, returns an empty proxy for type safety.
   *
   * @param {AbstractControl | FormGroup} control - The form control to create a proxy for.
   * @param {ComparisonValidationKey} key - The validation key determining proxy scope.
   * @returns {PathProxy<unknown>} A proxy object for form value access.
   */
  static getValidatorProxy(control: AbstractControl | FormGroup, key: ComparisonValidationKey): PathProxy<unknown> {
    const proxy = ValidatorFactory.createProxy({} as AbstractControl);
    if (Object.values(ComparisonValidationKeys).includes(key)) {
      return ValidatorFactory.createProxy((control instanceof FormGroup ? control : control.parent) as FormGroup);
    }
    return proxy;
  }

  /**
   * @summary Creates a proxy wrapper for an Angular AbstractControl to assist with custom validation logic.
   * @description Returns a structured proxy object that simulates a hierarchical tree of form values.
   * Enables Validators handling method to access parent and child properties using consistent dot-notation in Angular forms.
   *
   * @param {AbstractControl} control - The control to wrap in a proxy.
   * @returns {PathProxy<unknown>} A proxy object exposing form values and enabling recursive parent access.
   */
  static createProxy(control: AbstractControl | FormGroup): PathProxy<unknown> {
    return PathProxyEngine.create(control, {
      getValue(target: AbstractControl, prop: string): unknown {
        if (target instanceof FormControl) return target.value;

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
      getParent: function (target: AbstractControl) {
        return target?.['_parent'];
      },
      ignoreUndefined: true,
      ignoreNull: true,
    });
  }

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
  static resolveValidatorKeyProps = (
    key: string,
    type: string,
    fieldProps: FieldProperties,
    customTypes: string | undefined = undefined
  ): { validatorKey: string; props: KeyValue } => {
    const isTypeBased = this.isTypeBasedValidation(key, type, customTypes);
    const validatorKey = isTypeBased ? type : key;
    const value = this.getValidatorValue(key, type, fieldProps);
    const props = this.getValidatorProps(validatorKey, type, isTypeBased, value);
    return { validatorKey, props };
  };

  /**
   * Constructs the properties object to be passed to a validator.
   * Handles translation of string values and applies pattern validators for type-based validations.
   *
   * @param validatorKey - The resolved validator key.
   * @param type - The field's type.
   * @param isTypeBased - Whether this is a type-based validation.
   * @param value - The value to validate.
   * @returns An object containing validator properties.
   */
  static getValidatorProps(validatorKey: string, type: string, isTypeBased: boolean, value: unknown): KeyValue {
    return {
      [validatorKey]:
        !isTypeBased && validatorKey === ValidationKeys.TYPE
          ? NgxRenderingEngine.get().translate(value as string, false)
          : value,
      // Email, Password, and URL are validated using the "pattern" key
      ...(isTypeBased && { [ValidationKeys.PATTERN]: patternValidators[type] }),
    };
  }
}
