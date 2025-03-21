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
import {
  IonCheckbox,
  IonDatetime,
  IonInput,
  IonItem,
  IonLabel,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
  IonTextarea,
} from '@ionic/angular/standalone';
import {
  FieldUpdateMode,
  PossibleInputTypes,
  RadioOption,
  SelectOption,
  StringOrBoolean,
} from '../../engine/types';
import { TranslatePipe } from '@ngx-translate/core';
import { NgxCrudFormField } from '../../engine/NgxCrudFormField';
import { Dynamic } from '../../engine/decorators';
import {
  AutocompleteTypes,
  SelectInterface,
  TextFieldTypes,
} from '@ionic/core';

@Dynamic()
@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonInput,
    IonItem,
    IonCheckbox,
    IonRadioGroup,
    IonRadio,
    IonSelect,
    TranslatePipe,
    IonSelectOption,
    IonTextarea,
    IonDatetime,
    IonLabel,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'decaf-crud-field',
  templateUrl: './decaf-crud-field.component.html',
  styleUrl: './decaf-crud-field.component.scss',
})
export class DecafCrudFieldComponent
  extends NgxCrudFormField
  implements OnInit, OnDestroy, AfterViewInit
{
  @Input({ required: true })
  override operation!: CrudOperations;

  @Input({ required: true })
  override name!: string;

  @Input({ required: true })
  override type!: PossibleInputTypes;

  @Input()
  override value: string | number | Date = '';

  @Input()
  override disabled?: boolean;

  @Input({ required: true })
  label!: string;

  @Input()
  placeholder!: string;

  // Validation

  @Input()
  override format?: string;
  @Input()
  override hidden?: boolean;
  @Input()
  override max?: number | Date;
  @Input()
  override maxlength?: number;
  @Input()
  override min?: number | Date;
  @Input()
  override minlength?: number;
  @Input()
  override pattern?: string;
  @Input()
  override readonly?: boolean;
  @Input()
  override required?: boolean;
  @Input()
  override step?: number;

  // type specific options

  @Input()
  cols?: number;

  @Input()
  rows?: number;

  @Input()
  alignment?: 'start' | 'center';

  @Input()
  checked?: boolean;

  @Input()
  justify?: 'start' | 'end' | 'space-between';

  @Input()
  cancelText?: string;

  @Input()
  interface?: SelectInterface;

  @Input()
  options!: SelectOption[] | RadioOption[];

  // engine specific properties

  @Input()
  mode?: 'ios' | 'md';

  @Input()
  spellcheck: boolean = false;

  @Input()
  inputmode:
    | 'none'
    | 'text'
    | 'tel'
    | 'url'
    | 'email'
    | 'numeric'
    | 'decimal'
    | 'search' = 'none';

  @Input()
  autocomplete: AutocompleteTypes = 'off';

  @Input()
  fill: 'outline' | 'solid' = 'outline';

  @Input()
  labelPlacement: 'start' | 'end' | 'floating' | 'stacked' | 'fixed' =
    'stacked';

  // Component

  @Input()
  updateOn: FieldUpdateMode = 'change';

  @ViewChild('component', { read: ElementRef })
  override component!: ElementRef;

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
    super.onInit(this.updateOn);
  }
}
