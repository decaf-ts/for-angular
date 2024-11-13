import { ElementRef, Input, ViewChild, OnInit, Component } from '@angular/core';
import { InternalError, OperationKeys } from '@decaf-ts/db-decorators';
import {
  ControlValueAccessor,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { CrudFormField, FieldProperties } from '@decaf-ts/ui-decorators';
import { IonicModule } from '@ionic/angular';
import { Dynamic } from '../../engine/decorators';
import { AngularFieldDefinition } from '../../engine';

@Dynamic()
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'ngx-crud-form-field',
  standalone: true,
  imports: [ReactiveFormsModule, IonicModule],
  templateUrl: './ngx-crud-form-field.component.html',
  styleUrl: './ngx-crud-form-field.component.scss',
})
export class NgxCrudFormFieldComponent
  implements
    ControlValueAccessor,
    CrudFormField<AngularFieldDefinition>,
    OnInit
{
  @ViewChild('component', { read: ElementRef })
  component!: ElementRef;

  @Input()
  operation!:
    | OperationKeys.CREATE
    | OperationKeys.READ
    | OperationKeys.UPDATE
    | OperationKeys.DELETE;

  @Input()
  props!: FieldProperties & AngularFieldDefinition;

  @Input()
  value!: string;

  @Input()
  formGroup?: FormGroup;

  ngOnInit(): void {
    if (!this.props || !this.operation)
      throw new InternalError(`props and operation are required`);
    console.log('here');
  }

  writeValue(obj: any): void {
    throw new Error('Method not implemented.');
  }
  registerOnChange(fn: any): void {
    throw new Error('Method not implemented.');
  }
  registerOnTouched(fn: any): void {
    throw new Error('Method not implemented.');
  }
  setDisabledState?(isDisabled: boolean): void {
    throw new Error('Method not implemented.');
  }
}
