import { AfterViewInit, Component, ElementRef, HostListener, inject, OnInit, SimpleChanges, ViewChild, viewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Condition } from '@decaf-ts/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import { IonItem, IonCheckbox, IonLabel, IonSelect, IonSelectOption, IonText, SelectChangeEventDetail, SelectCustomEvent, IonInput } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { Batch } from 'src/app/ew/models/Batch';
import { Product } from 'src/app/ew/models/Product';
import { RouterService } from 'src/app/services/router.service';
import { getDocumentTypes } from 'src/app/ew/helpers';
import { CrudFieldComponent } from 'src/lib/components/crud-field/crud-field.component';
import { IconComponent } from 'src/lib/components/icon/icon.component';
import { ComponentEventNames } from 'src/lib/engine/constants';
import { Dynamic } from 'src/lib/engine/decorators';
import { ForAngularCommonModule, getModelAndRepository } from 'src/lib/for-angular-common.module';
import { getOnWindow, setOnWindow, windowEventEmitter } from 'src/lib/utils/helpers';
import { DatePipe } from '@angular/common';
import { timer } from 'rxjs';

@Dynamic()
@Component({
  selector: 'app-expiry-date-field',
  templateUrl: './expiry-date-field.component.html',
  styleUrls: ['./expiry-date-field.component.scss'],
  imports: [
     TranslatePipe,
     ForAngularCommonModule,
     IconComponent,
     IonInput,
     IonCheckbox,
     IonItem,
     IonLabel,
     IonText,
    ],
  standalone: true,
})
export class ExpiryDateFieldComponent extends CrudFieldComponent implements AfterViewInit, OnInit {

  @ViewChild('calendarInputElement', { read: ElementRef, static: false })
  calendarInputElement!: ElementRef<HTMLInputElement>;

  routerService: RouterService = inject(RouterService);

  expiryDate?: string;
  enableDaySelection: boolean = true;
  calendarInputValue?: string;

  override async ngOnInit(): Promise<void> {
    await super.ngOnInit();
    if(this.operation === OperationKeys.CREATE) {
      if(this.name === 'enableDaySelection')
        this.enableDaySelection = this.checked = true;
    } else {
      // this.model = await this.handleBatchQuery(this.modelId as string);
      // console.log(this.model);

    }

    // if(this.name === 'expiryDate') {
    //   if(this.value) {
    //     const value = this.value as string;
    //     if(value.includes('00')) {
    //       this.enableDaySelection = false;
    //     }
    //   }
    // }
  }

  override async ngAfterViewInit(): Promise<void> {
    await super.ngAfterViewInit();
    // if(this.name === 'batchNumber') {
    //   if(this.operation === OperationKeys.CREATE) {
    //     const batchNumber = this.routerService.getQueryParamValue('batchNumber');
    //     if(batchNumber) {
    //       this.value = batchNumber as string;
    //       this.disabled = false;
    //       if(this.formGroup instanceof FormGroup)
    //         this.formGroup?.enable();
    //     }
    //   }
    //   if(this.value)
    //     windowEventEmitter(ComponentEventNames.CHANGE, {source: this.name, value: this.value});
    // }

  }


  override async ngOnChanges(changes: SimpleChanges): Promise<void> {
    await super.ngOnChanges(changes);
    if(this.operation !== OperationKeys.CREATE) {
      if(changes['formGroup']) {
        const formGroup = (this.formGroup as FormGroup).value;
        const expiryDate = formGroup?.expiryDate as string;
        if(expiryDate) {
          this.enableDaySelection = !expiryDate.includes('00');
          if(this.name === 'enableDaySelection') {
            this.checked = this.enableDaySelection;
          }
          if(this.name === 'expiryDate') {
            this.value = expiryDate;
            this.changeDetectorRef.detectChanges();
             this.calendarInputValue = this.revertGS1ToDateValue(expiryDate);
          }
        }
      }
    }
  }

  handleChange(event: CustomEvent) {
    const {value, checked} = event.detail;
    windowEventEmitter(ComponentEventNames.CHANGE, {
      source: this.name,
      value: (this.type === this.HTML5InputTypes.CHECKBOX ? checked : value)
    });
  }

  @HostListener('window:ChangeEvent', ['$event'])
  override async handleEvent(event: CustomEvent): Promise<void> {
    const { source, value } = event.detail;
    if(source !== this.name) {
      if(source === 'calendarInput') {
        if(this.name === 'enableDaySelection')
          this.expiryDate =  value
      }

      if(source === 'enableDaySelection') {
        this.enableDaySelection = value as boolean;
        const currentValue = this.calendarInputValue;
        if(currentValue) {
          const calendarElement = this.calendarInputElement.nativeElement;
          const value = this.enableDaySelection ?
            `${currentValue}-${this.getLastDayOfMonth(currentValue)}` : currentValue.substring(0, 7);
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

  showCalendar(event: Event, element: HTMLInputElement, placeholder: boolean = false) {
    event.preventDefault();
    event.stopImmediatePropagation();
    // if(placeholder)
    //   return this.component.nativeElement.setFocus();
    if ('showPicker' in element)
      element.showPicker();
  }

  handleCalendarPick(value: string) {
    if(value) {
      this.calendarInputValue = value;
      this.value = this.parseCalendarInputValue(value);
      this.changeDetectorRef.detectChanges();
      this.setValue(this.value);
      const nativeElement = this.component.nativeElement;
      const subscription = timer(50).subscribe(() => {
       this.calendarInputElement.nativeElement.blur();
        // nativeElement.parentNode?.dispatchEvent(new CustomEvent('ionBlur'));
      });
      windowEventEmitter(ComponentEventNames.CHANGE, {
        source: 'calendarInput',
        value: this.value
      });
    }
  }


  getLastDayOfMonth(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    return `${new Date(year, month, day || 0).getDate()}`;
  }

  parseCalendarInputValue(date: string, revert: boolean = false): string {
    if(revert) {
        const separator = '-';
        const dateParts = date.split(separator);
        return this.enableDaySelection
            ? dateParts[2] + "/" + dateParts[1] + "/" + dateParts[0]
            : dateParts[1] + "/" + dateParts[0];
    }
    const result = date.split('-').map((part, index) => index === 0 ? part.slice(2) : part) as string[];
    if(result.length === 2)
      result.push(!this.enableDaySelection ? '00' : this.getLastDayOfMonth(result.join('-')));
    return result.join('');
  };

  revertGS1ToDateValue(date: string): string {
    const year = 2000 + Number(date.slice(0, 2));
    const month = Number(date.slice(2, 4)) - 1;
    if(!this.enableDaySelection)
      return `${year}-${month + 1}`;
    let day = Number(date.slice(4, 6));
    day = day === 0 ? Number(this.getLastDayOfMonth(`${year}-${(month + 1)}`)) : day;
    return `${year}-${month}-${day < 10 ? '0' + day : day}`;
  }


  async handleBatchQuery(uid: string): Promise<Batch | undefined> {
    const context = getModelAndRepository('Batch');
    let batch = getOnWindow('_lastBatch') as Batch | undefined;
    console.log('handleBatchQuery', uid);
    if(context) {
      const {repository} = context;
      if(!batch || batch.productCode !== uid) {
        this.value = '';
        batch = await repository.read(uid) as Batch;
        if(batch) {
          console.log('batch', batch);
          setOnWindow('_lastBatch', {
           expiryDate: batch.expiryDate as string,
          } as Batch);
        }
      }
    }
    return batch;
  }

  async handleBatchProductQuery(uid: string) {
    const relation = 'productCode'  as keyof Model;
    const condition = Condition.attribute<Model>(relation).eq(uid);
    this.disabled = false;
    if(this.formGroup instanceof FormGroup)
      this.formGroup?.enable();
    if(this.repository) {
      const query = await this.repository.query(condition, relation);
      this.options = query;
      await this.getOptions();
    }
  }

  async setProductValue(batchId: string) {
    const repo = getModelAndRepository('Batch');
    if(repo) {
      const {repository} = repo;
      const {productCode} = await repository.read(batchId) as Batch;
      if(productCode)
        this.value = productCode;
    }
  }

  async filterTypeOptions(type: 'product' | 'batch' = 'product') {
    const value = this.value;
    this.options = getDocumentTypes(type);
    await this.getOptions();
    this.value = value;
  }
}
