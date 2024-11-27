import { ElementRef, Input, ViewChild, OnInit, Component } from '@angular/core';
import { InternalError, OperationKeys } from '@decaf-ts/db-decorators';
import {
  ControlValueAccessor,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  CrudFormField,
  FieldProperties,
  HTML5InputTypes,
} from '@decaf-ts/ui-decorators';
import { IonicModule } from '@ionic/angular';
import { Dynamic } from '../../engine/decorators';
import {
  AngularFieldDefinition,
  RadioOption,
  SelectOption,
  StringOrBoolean,
} from '../../engine/types';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FormService } from '../../engine/FormService';

@Dynamic()
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'ngx-crud-form-field',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, IonicModule, TranslateModule],
  templateUrl: './ngx-crud-form-field.component.html',
  styleUrl: './ngx-crud-form-field.component.scss',
})
export class NgxCrudFormFieldComponent
  implements
    ControlValueAccessor,
    CrudFormField<AngularFieldDefinition>,
    OnInit
{
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onChange: () => unknown = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onTouch: () => unknown = () => {};

  @ViewChild('component', { read: ElementRef })
  component!: ElementRef;

  @Input({ required: true })
  operation!:
    | OperationKeys.CREATE
    | OperationKeys.READ
    | OperationKeys.UPDATE
    | OperationKeys.DELETE;

  @Input({ required: true })
  props!: FieldProperties & AngularFieldDefinition;

  @Input()
  options!: SelectOption[] | RadioOption[];

  @Input()
  value!: string;

  @Input()
  formGroup!: FormGroup;

  @Input()
  translatable: StringOrBoolean = true;

  ngOnInit(): void {
    if (!this.props || !this.operation)
      throw new InternalError(`props and operation are required`);
    this.formGroup = FormService.fromProps(this.props);
  }

  writeValue(obj: string): void {
    this.value = obj;
  }

  registerOnChange(fn: () => unknown): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => unknown): void {
    this.onTouch = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.props.disabled = isDisabled;
  }

  protected readonly HTML5InputTypes: string[] = Object.values(HTML5InputTypes);
}
