import { IonCheckbox, IonInput, IonSelect, IonTextarea } from '@ionic/angular';
import { TextFieldTypes } from '@ionic/core';
import { Injector, Type } from '@angular/core';
import { FormGroup } from '@angular/forms';

export type KeyValue = { [index: string]: any };

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
  instance?:  Type<unknown>
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

export interface IListItemComponent {
  title?: string;
  modelId?: string;
  modelPk?: string;
  modelPage?: string;
  className?: string;
  operations?: string[];
  lines?: 'inset' | 'full' | 'none';
  button?: StringOrBoolean;
  icon?: string;
  iconSlot?: 'start' | 'end';
  titleClassName?: string;
  subtitle?: string;
  subtitleClassName?: string;
  info?: string;
  subinfo?: string;
}

export interface IListItemProps {
  render: StringOrBoolean;
  mapper?: KeyValue;
  modelId?: string;
  translateProps?: string | string[];
  className?: string;
  button?: StringOrBoolean;
  icon?: string;
  iconSlot?: 'start' | 'end';
  titleClassName?: string;
  subtitleClassName?: string;
}

export type ListItemActionEvent = {
  action: string;
  id: string;
  target?: HTMLElement;
  pk?: string;
};

export interface IListComponentRefreshEvent {
  data: KeyValue[];
}

export type FormServiceControls = Record<
  string,
  Record<string, { control: FormGroup; props: AngularFieldDefinition }>
>;


export interface ModelRenderCustomEvent {
  data: unknown;
  name: string;
  component: string;
}
