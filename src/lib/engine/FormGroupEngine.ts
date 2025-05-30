import { FormGroup } from '@angular/forms';
import { NgxFormService } from './NgxFormService';
import { FieldUpdateMode } from './types';
import { FieldProperties } from '@decaf-ts/ui-decorators';

export interface ComponentInput extends FieldProperties {
  childrenof?: string;
  updateMode?: FieldUpdateMode;
  formGroup?: FormGroup;
}

export interface ComponentConfig {
  component: string;
  inputs: ComponentInput;
  injector: any;
}

export class FormGroupEngine {
  /**
   * Builds a FormGroup from a flat array of components, using the `childrenof` property
   * to establish nested hierarchy.
   *
   * @param components - Flat array of component configurations
   * @returns {FormGroup} FormGroup - Root FormGroup containing the complete nested structure
   */
  static buildFormFromComponents(components: ComponentConfig[]): FormGroup {
    const rootForm = new FormGroup({});
    components.forEach(component => {
      this.addFormControl(component, rootForm);
    });
    return rootForm;
  }

  /**
   * Adds a FormControl to the specified FormGroup, respecting the nesting structure
   * defined via `childrenof`. Also updates the component's `formGroup` reference.
   *
   * @param component - The component configuration to process
   * @param formGroup - The root FormGroup to add the control to
   */
  private static addFormControl(component: ComponentConfig, formGroup: FormGroup): void {
    const { name, childrenof } = component.inputs;
    const fullPath = childrenof ? `${childrenof}.${name}` : name;
    const [parentGroup, controlName] = this.resolveParentGroup(formGroup, fullPath);

    if (!parentGroup.get(controlName)) {
      const control = NgxFormService.fromProps(
        component.inputs,
        component.inputs.updateMode || 'change',
        Math.random().toString(),
      );
      parentGroup.addControl(controlName, control);
    }

    component.inputs.formGroup = parentGroup;
    // component.inputs.formControl = parentGroup.get(controlName) as FormControl;
  }

  /**
   * Resolves the parent FormGroup and control name from a dot-delimited path.
   * Automatically creates missing intermediate FormGroups if necessary.
   *
   * @param rootForm - The root FormGroup to traverse
   * @param path - The full path string (e.g., 'address.billing.street')
   * @returns A tuple: [parent FormGroup, final control name]
   */
  private static resolveParentGroup(rootForm: FormGroup, path: string): [FormGroup, string] {
    const parts = path.split('.');
    const controlName = parts.pop() as string; // last element is always the control name

    let currentGroup = rootForm;

    for (const part of parts) {
      if (!currentGroup.get(part)) {
        currentGroup.addControl(part, new FormGroup({}));
      }
      currentGroup = currentGroup.get(part) as FormGroup;
    }

    return [currentGroup, controlName];
  }
}
