import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { IonItem, IonCheckbox, IonLabel, IonText, IonInput } from '@ionic/angular/standalone';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { timer } from 'rxjs';
import { Dynamic, ComponentEventNames } from 'src/lib/engine';
import { ForAngularCommonModule } from 'src/lib/for-angular-common.module';
import { CrudFieldComponent } from 'src/lib/components';
import { windowEventEmitter } from 'src/lib/utils/helpers';

@Dynamic()
@Component({
  selector: 'app-expiry-date-field',
  templateUrl: './expiry-date-field.component.html',
  styleUrls: ['./expiry-date-field.component.scss'],
  imports: [
    TranslatePipe,
    IonInput,
    IonCheckbox,
    IonItem,
    IonLabel,
    IonText,
    ForAngularCommonModule,
  ],
  standalone: true,
})
export class AppExpiryDateFieldComponent extends CrudFieldComponent implements OnInit {
  @ViewChild('calendarInputElement', { read: ElementRef, static: false })
  calendarInputElement!: ElementRef<HTMLInputElement>;

  expiryDate?: string;

  enableDaySelection: boolean = true;

  calendarInputValue?: string;

  override async ngOnInit(): Promise<void> {
    await super.ngOnInit();
    await super.initialize();
  }

  override async ngOnChanges(changes: SimpleChanges): Promise<void> {
    await super.ngOnChanges(changes);
    if (this.operation === OperationKeys.UPDATE) {
      if (changes['formGroup']) {
        const formGroup = (this.formGroup as FormGroup).value;
        const expiryDate = formGroup?.expiryDate as string;
        if (expiryDate) {
          this.enableDaySelection = !expiryDate.includes('00');
          if (this.name === 'enableDaySelection') {
            this.checked = this.enableDaySelection;
            this.expiryDate = expiryDate;
          }
          if (this.name === 'expiryDate') {
            this.value = expiryDate;
            this.calendarInputValue = this.revertGS1ToDateValue(expiryDate);
            this.changeDetectorRef.detectChanges();
          }
        }
      }
    }
  }

  handleChange(event: CustomEvent) {
    const { value, checked } = event.detail;
    windowEventEmitter(ComponentEventNames.Change, {
      source: this.name,
      value: this.type === this.HTML5InputTypes.CHECKBOX ? checked : value,
    });
  }

  @HostListener('window:ChangeEvent', ['$event'])
  override async handleEvent(event: CustomEvent): Promise<void> {
    const { source, value } = event.detail;
    if (source !== this.name) {
      if (source === 'calendarInput') {
        if (this.name === 'enableDaySelection') this.expiryDate = value;
      }

      if (source === 'enableDaySelection') {
        this.enableDaySelection = value as boolean;
        const currentValue = this.calendarInputValue;
        if (currentValue) {
          const calendarElement = this.calendarInputElement.nativeElement;
          const value = this.enableDaySelection
            ? `${currentValue}-${this.getLastDayOfMonth(currentValue)}`
            : currentValue.substring(0, 7);
          this.calendarInputValue = value;
          calendarElement.value = value;
          const timerSubsctiption = timer(100).subscribe(() => {
            calendarElement.dispatchEvent(new Event('change'));
            timerSubsctiption.unsubscribe();
          });
          this.expiryDate = value;
          this.changeDetectorRef.detectChanges();
        }
      }
    }
  }

  showCalendar(event: Event, element: HTMLInputElement) {
    event.preventDefault();
    event.stopImmediatePropagation();
    // if(placeholder)
    //   return this.component.nativeElement.setFocus();
    if ('showPicker' in element) element.showPicker();
  }

  handleCalendarPick(value: string) {
    if (value) {
      this.calendarInputValue = value;
      this.value = this.parseCalendarInputValue(value);
      this.changeDetectorRef.detectChanges();
      this.setValue(this.value);
      const subscription = timer(50).subscribe(() => {
        this.calendarInputElement.nativeElement.blur();
        subscription.unsubscribe();
        // nativeElement.parentNode?.dispatchEvent(new CustomEvent('ionBlur'));
      });
      windowEventEmitter(ComponentEventNames.Change, {
        source: 'calendarInput',
        value: this.value,
      });
    }
  }

  getLastDayOfMonth(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    return `${new Date(year, month, day || 0).getDate()}`;
  }

  parseCalendarInputValue(date: string, revert: boolean = false): string {
    if (revert) {
      const separator = '-';
      const dateParts = date.split(separator);
      return this.enableDaySelection
        ? dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0]
        : dateParts[1] + '/' + dateParts[0];
    }
    const result = date
      .split('-')
      .map((part, index) => (index === 0 ? part.slice(2) : part)) as string[];
    if (result.length === 2)
      result.push(!this.enableDaySelection ? '00' : this.getLastDayOfMonth(result.join('-')));
    //TODO: change day selection to last day of month only when enableDaySelection is false
    // if (result.length === 2) result.push(this.getLastDayOfMonth(result.join('-')));
    return result.join('');
  }

  revertGS1ToDateValue(date: string): string {
    const year = 2000 + Number(date.slice(0, 2));
    const month = Number(date.slice(2, 4));
    if (!this.enableDaySelection) return `${year}-${month}`;
    let day = Number(date.slice(4, 6));
    day = day === 0 ? Number(this.getLastDayOfMonth(`${year}-${month}`)) : day;
    return `${year}-${month}-${day < 10 ? '0' + day : day}`;
  }
}
