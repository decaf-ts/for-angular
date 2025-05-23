import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ComparisonValidationKeys, Validation, Validator } from '@decaf-ts/decorator-validation';
import { FieldProperties, HTML5InputTypes, parseValueByType } from '@decaf-ts/ui-decorators';
import { NgxFormService } from './NgxFormService';

export class ValidatorFactory {
  static spawn(
    fieldProps: FieldProperties,
    key: string,
    formId: string,
  ): ValidatorFn {
    if (!Validation.keys().includes(key))
      throw new Error('Unsupported custom validation');

    const type = fieldProps.type;

    const validatorFn: ValidatorFn = (
      control: AbstractControl,
    ): ValidationErrors | null => {
      const validator = Validation.get(key) as Validator;

      const value =
        typeof control.value !== 'undefined'
          ? parseValueByType(type, type === HTML5InputTypes.CHECKBOX ? fieldProps.name : control.value, fieldProps)
          : undefined;

      // arg = RenderingEngine.get().translate(arg as string, false);
      // const actualArg = parseArgs(arg);

      let formData = {};
      if (Object.values(ComparisonValidationKeys).includes(key as any)) {
        try {
          formData = NgxFormService.getFormData(formId);
          console.log('formData=', formData);
        } catch (e: any) {
        }
      }

      let errs;
      try {
        errs = validator.hasErrors(
          value,
          {
            [key]: fieldProps[key as keyof FieldProperties],
          },
          formData,
        );
      } catch (e: unknown) {
        console.warn(`${key} validator failed to validate: ${e}`);
      }

      return errs ? { [key]: true } : null;
    };

    Object.defineProperty(validatorFn, 'name', {
      value: `${key}Validator`,
    });

    return validatorFn;
  }
}
