import { Component, ElementRef, Input, ViewChild, OnInit } from '@angular/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { ControlValueAccessor } from '@angular/forms';
import { CrudFormField, FieldProperties } from '@decaf-ts/ui-decorators';

@Component({
  selector: 'app-ngx-crud-form-field',
  standalone: true,
  imports: [],
  templateUrl: './ngx-crud-form-field.component.html',
  styleUrl: './ngx-crud-form-field.component.scss',
})
export class NgxCrudFormFieldComponent
  implements ControlValueAccessor, CrudFormField, OnInit
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
  props!: FieldProperties;

  @Input()
  value!: string;

  ngOnInit(): void {}

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
