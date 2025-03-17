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
import { HTML5InputTypes } from '@decaf-ts/ui-decorators';
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
  FieldUpdateMode,
  RadioOption,
  SelectOption,
  StringOrBoolean,
} from '../../engine/types';
import { TranslatePipe } from '@ngx-translate/core';
import { DecafFieldDirective } from '../../directives/decaf-field.directive';
import { NgClass } from '@angular/common';
import { NgxCrudFormField } from '../../engine/NgxCrudFormField';
import { Dynamic } from '../../engine/decorators';

@Dynamic()
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
    DecafFieldDirective,
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
  @Input()
  updateOn: FieldUpdateMode = 'change';

  @ViewChild('component', { read: ElementRef })
  override component!: ElementRef;

  @Input({ required: true })
  override operation!: CrudOperations;

  @Input({ required: true })
  override props!: AngularFieldDefinition;

  @Input()
  override name!: string;

  @Input()
  options!: SelectOption[] | RadioOption[];

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

  protected readonly HTML5InputTypes: string[] = Object.values(HTML5InputTypes);
}
