import { IonCheckbox, IonInput, IonSelect, IonTextarea } from '@ionic/angular';
import { ComponentRef, HTMLStencilElement, TextFieldTypes } from '@ionic/core';
import { ElementRef, Injector, Type } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { NgxRenderingEngine2 } from './NgxRenderingEngine2';

export type KeyValue = Record<string, any>;

export type ElementSizes =
  | 'small'
  | 'medium'
  | 'large'
  | 'xlarge'
  | '2xlarge'
  | 'auto'
  | 'expand'
  | 'block';

export type ElementPositions = 'left' | 'center' | 'right' | 'top' | 'bottom';

export type FlexPositions =
  | ElementPositions
  | 'stretch'
  | 'middle'
  | 'around'
  | 'between';

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
  rendererId?: string;
  inputs?: Record<string, unknown>;
  injector?: Injector;
  content?: Node[][];
  children?: AngularDynamicOutput[];
  instance?:  Type<unknown>;
};

export interface RenderedModel {
  rendererId?: string;
}

export type PossibleInputTypes =
  | 'checkbox'
  | 'radio'
  | 'select'
  | TextFieldTypes
  | 'textarea';

export type AngularFieldDefinition = Omit<
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
    type: PossibleInputTypes;
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

// export interface IListItemProp {
//   render?: string | boolean;
//   translateProps?: string | string[];
//   button?: StringOrBoolean;
//   icon?: string;
//   iconSlot?: 'start' | 'end';
//   title?: string;
//   descritpion?: string;
//   info?: string;
//   subinfo?: string;
// }



export interface IListComponentRefreshEvent {
  data: KeyValue[];
}

export type FormServiceControls = Record<
  string,
  Record<string, { control: FormGroup; props: AngularFieldDefinition }>
>;


export interface ModelRenderCustomEvent {
  detail: BaseCustomEvent;
  component: string;
  name: string;
}

export interface ListItemCustomEvent extends BaseCustomEvent {
  action: string;
  pk?: string;
};

export interface BaseCustomEvent {
  data: any;
  target?: HTMLElement;
  name?: string;
  component: string;
}

