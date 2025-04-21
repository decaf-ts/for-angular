
const commonInputProps = {
  name: 'field-name',
  label: 'field label',
  placeholder: 'field placeholder',
  type: 'text',
  hidden: false,
  // Validation
  required: true,
  // readonly: false,
  // maxLength: number;
  // minLength?: number;
  // max?: number | Date;
  // min?: number | Date;
  // pattern?: string;
  // step?: number;
  // custom?: string[];
};



/**
 * Generates form field properties by combining common input properties with specific field details.
 *
 * @param name - The name of the field, used to generate the field's name and label.
 * @param type - The type of the input field. Defaults to 'text'.
 * @param value - The initial value of the field. Can be a string, number, or Date. Defaults to an empty string.
 * @returns An object containing the combined form field properties.
 */
export function getFormFieldProps(
  name: string,
  type = 'text',
  value: string | number | Date = '',
) {
  return Object.assign({}, commonInputProps, {
    name: `field-${name}`,
    label: `Label for field ${name}`,
    placeholder: `placeholder for field ${type}`,
    type: type,
    value: value,
  });
}
