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
    this.parent = FormService.inputAfterViewInit(this);
  }

  ngOnDestroy(): void {
    FormService.inputOnDestroy(this, this.parent);
  }

  ngOnInit(): void {
    FormService.inputOnInit(this);
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
