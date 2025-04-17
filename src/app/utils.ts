
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
