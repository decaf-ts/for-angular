import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  Input,
  NO_ERRORS_SCHEMA,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  CrudOperations,
  InternalError,
  OperationKeys,
} from '@decaf-ts/db-decorators';
import {
  ControlValueAccessor,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { FieldProperties, HTML5InputTypes } from '@decaf-ts/ui-decorators';
import {
  IonCheckbox,
  IonInput,
  IonItem,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import {
  AngularFieldDefinition,
  RadioOption,
  SelectOption,
  StringOrBoolean,
} from '../../engine/types';
import { FormService } from '../../engine/FormService';
import { TranslatePipe } from '@ngx-translate/core';
import { NgxCrudFormField } from '../../interfaces';
import { CommonModule } from '@angular/common';
import { FormElementNameDirective } from '../../directives/form-element-name.directive';

// @Dynamic()
@Component({
  standalone: true,
  imports: [
    IonInput,
    IonItem,
    IonCheckbox,
    IonRadioGroup,
    IonRadio,
    IonSelect,
    TranslatePipe,
    CommonModule,
    ReactiveFormsModule,
    IonSelectOption,
    FormElementNameDirective,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'crud-form-field',
  templateUrl: './crud-form-field.component.html',
  styleUrl: './crud-form-field.component.scss',
})
export class CrudFormFieldComponent
  implements
    ControlValueAccessor,
    NgxCrudFormField,
    OnInit,
    OnDestroy,
    AfterViewInit
{
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onChange: () => unknown = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onTouch: () => unknown = () => {};

  @ViewChild('component', { read: ElementRef })
  component!: ElementRef;

  @Input()
  name!: string;

  @Input({ required: true })
  operation!: CrudOperations;

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

  private parent?: HTMLElement;

  ngAfterViewInit() {
    console.log(`after init of ${this}`);
    switch (this.operation) {
      case OperationKeys.CREATE:
      case OperationKeys.UPDATE:
      case OperationKeys.DELETE:
        try {
          this.parent = FormService.getParentEl(
            this.component.nativeElement,
            'form',
          );
        } catch (e: unknown) {
          throw new Error(
            `Unable to retrieve parent form element for the ${this.operation}: ${e instanceof Error ? e.message : e}`,
          );
        }
        FormService.register(
          this.parent.id,
          this.component.nativeElement,
          this.formGroup,
        );
        break;
      default:
        throw new Error(`Invalid operation: ${this.operation}`);
    }
  }

  ngOnDestroy(): void {
    if (this.parent)
      FormService.unregister(this.parent.id, this.component.nativeElement);
  }

  ngOnInit(): void {
    if (!this.props || !this.operation)
      throw new InternalError(`props and operation are required`);
    this.formGroup = FormService.fromProps(this.props);
    this.name = this.props.name;
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
