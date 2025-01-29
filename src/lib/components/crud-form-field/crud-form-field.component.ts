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
import { CrudOperations } from '@decaf-ts/db-decorators';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
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
import { TranslatePipe } from '@ngx-translate/core';
import { FormElementNameDirective } from '../../directives/form-element-name.directive';
import { NgClass } from '@angular/common';
import { NgxCrudFormField } from '../../engine/NgxCrudFormField';

// @Dynamic()
@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgClass,
    IonInput,
    IonItem,
    IonCheckbox,
    IonRadioGroup,
    IonRadio,
    IonSelect,
    TranslatePipe,
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
  extends NgxCrudFormField
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChild('component', { read: ElementRef })
  override component!: ElementRef;

  @Input({ required: true })
  override operation!: CrudOperations;

  @Input({ required: true })
  override props!: FieldProperties & AngularFieldDefinition;

  @Input()
  options!: SelectOption[] | RadioOption[];

  @Input()
  override value!: string;

  @Input()
  override formGroup!: FormGroup;

  @Input()
  translatable: StringOrBoolean = true;

  ngAfterViewInit() {
    super.afterViewInit();
  }

  ngOnDestroy(): void {
    this.onDestroy();
  }

  ngOnInit(): void {
    super.onInit();
  }

  protected readonly HTML5InputTypes: string[] = Object.values(HTML5InputTypes);
}
