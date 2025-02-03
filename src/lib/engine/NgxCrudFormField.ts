import { CrudFormField } from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition, FieldUpdateMode } from './types';
import {
  CrudOperations,
  InternalError,
  OperationKeys,
} from '@decaf-ts/db-decorators';
import { ControlValueAccessor, FormGroup } from '@angular/forms';
import { ElementRef } from '@angular/core';
import { NgxFormService } from './NgxFormService';
import { sf } from '@decaf-ts/decorator-validation';

export abstract class NgxCrudFormField
  implements CrudFormField<AngularFieldDefinition>, ControlValueAccessor
{
  component!: ElementRef;

  operation!: CrudOperations;

  props!: AngularFieldDefinition;

  formGroup!: FormGroup;

  name!: string;

  value!: string;

  protected parent?: HTMLElement;

  /**
   * @description provides access to {@link sf} function
   * @summary enables easy access to error message formating on the HTL side
   */
  sf = sf;

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
          parent = NgxFormService.getParentEl(
            this.component.nativeElement,
            'form',
          );
        } catch (e: unknown) {
          throw new Error(
            `Unable to retrieve parent form element for the ${this.operation}: ${e instanceof Error ? e.message : e}`,
          );
        }
        NgxFormService.register(parent.id, this.formGroup, this.props);
        return parent;
      default:
        throw new Error(`Invalid operation: ${this.operation}`);
    }
  }

  onDestroy(): void {
    if (this.parent)
      NgxFormService.unregister(this.parent.id, this.component.nativeElement);
  }

  onInit(updateOn: FieldUpdateMode): void {
    if (!this.props || !this.operation)
      throw new InternalError(`props and operation are required`);
    this.formGroup = NgxFormService.fromProps(this.props, updateOn);
    this.name = this.props.name;
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
