import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CrudOperations } from '@decaf-ts/db-decorators';
import {
  FieldUpdateMode,
  PossibleInputTypes,
  RadioOption,
  SelectOption,
  StringOrBoolean,
} from '../../engine/types';
import { NgxCrudFormField } from '../../engine/NgxCrudFormField';
import { Dynamic } from '../../engine/decorators';
import {
  AutocompleteTypes,
  SelectInterface
} from '@ionic/core';
import { ForAngularModule } from 'src/lib/for-angular.module';

@Dynamic()
@Component({
  standalone: true,
  imports: [ForAngularModule],
  selector: 'ngx-decaf-crud-field',
  templateUrl: './crud-field.component.html',
  styleUrl: './crud-field.component.scss',
})
export class CrudFieldComponent
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
  labelPlacement: 'start' | 'end' | 'floating' | 'stacked' | 'fixed' = 'floating';

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
