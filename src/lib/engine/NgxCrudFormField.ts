import { CrudFormField, FieldProperties } from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition } from './types';
import {
  CrudOperations,
  InternalError,
  OperationKeys,
} from '@decaf-ts/db-decorators';
import { ControlValueAccessor, FormGroup } from '@angular/forms';
import { ElementRef } from '@angular/core';
import { FormService } from './FormService';

export abstract class NgxCrudFormField
  implements CrudFormField<AngularFieldDefinition>, ControlValueAccessor
{
  component!: ElementRef;

  operation!: CrudOperations;

  props!: FieldProperties & AngularFieldDefinition;

  formGroup!: FormGroup;

  value!: string;

  protected parent?: HTMLElement;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onChange: () => unknown = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onTouch: () => unknown = () => {};

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

  afterViewInit() {
    let parent: HTMLElement;
    switch (this.operation) {
      case OperationKeys.CREATE:
      case OperationKeys.UPDATE:
      case OperationKeys.DELETE:
        try {
          parent = FormService.getParentEl(
            this.component.nativeElement,
            'form',
          );
        } catch (e: unknown) {
          throw new Error(
            `Unable to retrieve parent form element for the ${this.operation}: ${e instanceof Error ? e.message : e}`,
          );
        }
        FormService.register(
          parent.id,
          this.component.nativeElement,
          this.formGroup,
          this.props,
        );
        return parent;
      default:
        throw new Error(`Invalid operation: ${this.operation}`);
    }
  }

  onDestroy(): void {
    if (this.parent)
      FormService.unregister(this.parent.id, this.component.nativeElement);
  }

  onInit(): void {
    if (!this.props || !this.operation)
      throw new InternalError(`props and operation are required`);
    this.formGroup = FormService.fromProps(this.props);
  }

  getErrors() {
    return Object.entries(this.formGroup.controls).reduce(
      (accum: { key: string; message: string }[], [prop, control]) => {
        Object.entries(control.errors as Record<string, unknown>).forEach(
          ([k, c]) => {
            accum.push({ key: k, message: k });
          },
        );
        return accum;
      },
      [],
    );
  }
}
