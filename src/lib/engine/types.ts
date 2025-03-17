import { FieldProperties } from '@decaf-ts/ui-decorators';
import { IonCheckbox, IonInput, IonSelect, IonTextarea } from '@ionic/angular';
import { TextFieldTypes } from '@ionic/core';
import { Injector, Type } from '@angular/core';

export type FieldUpdateMode = 'change' | 'blur' | 'submit';

export interface ComponentMetadata {
  changeDetection: number;
  selector: string;
  standalone: boolean;
  imports: (new (...args: unknown[]) => unknown)[];
  template: string;
  styles: string[];
}

export type AngularDynamicOutput = {
  component: Type<unknown>;
  inputs?: Record<string, unknown>;
  injector?: Injector;
  content?: Node[][];
  children?: AngularDynamicOutput[];
};

export type AngularFieldDefinition = FieldProperties &
  Omit<
    IonInput,
    | 'ionInput'
    | 'ionFocus'
    | 'ionChange'
    | 'ionBlur'
    | 'getInputElement'
    | 'setFocus'
    | 'label'
    | 'el'
    | 'z'
    | 'type'
  > &
  Pick<
    IonSelect,
    'cancelText' | 'interface' | 'selectedText' | 'interfaceOptions'
  > &
  Pick<IonTextarea, 'rows' | 'cols'> &
  Pick<IonCheckbox, 'alignment' | 'justify' | 'checked'> & {
    type: 'checkbox' | 'radio' | 'select' | TextFieldTypes | 'textarea';
    className: string | string[];
  } & Record<string, unknown>;

export type StringOrBoolean = 'true' | 'false' | boolean;

export type SelectOption = InputOption & { selected?: boolean };
export type CheckboxOption = RadioOption;
export type RadioOption = InputOption & { checked?: boolean };

export interface InputOption {
  text: string;
  value: string | number;
  disabled?: StringOrBoolean;
  className?: string;
  icon?: string;
}

export type HTMLFormTarget = '_blank' | '_self' | '_parent' | '_top' | string;
