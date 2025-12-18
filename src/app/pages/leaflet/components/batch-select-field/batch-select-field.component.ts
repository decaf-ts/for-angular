import { AfterViewInit, Component, HostListener, inject, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Condition } from '@decaf-ts/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import { IonItem, IonLabel, IonSelect, IonSelectOption, IonText, SelectChangeEventDetail, SelectCustomEvent } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { Batch } from 'src/app/ew/models/Batch';
import { RouterService } from 'src/app/services/router.service';
import { getDocumentTypes } from 'src/app/utils/helpers';
import { CrudFieldComponent } from 'src/lib/components/crud-field/crud-field.component';
import { IconComponent } from 'src/lib/components/icon/icon.component';
import { ComponentEventNames } from 'src/lib/engine/constants';
import { Dynamic } from 'src/lib/engine/decorators';
import { ForAngularCommonModule, getModelAndRepository } from 'src/lib/for-angular-common.module';
import { windowEventEmitter } from 'src/lib/utils/helpers';

@Dynamic()
@Component({
  selector: 'app-batch-select-field',
  templateUrl: './batch-select-field.component.html',
  styleUrls: ['./batch-select-field.component.scss'],
  imports: [TranslatePipe, ForAngularCommonModule, IconComponent, IonItem, IonLabel, IonText, IonSelect, IonSelectOption],
  standalone: true,
})
export class BatchSelectFieldComponent extends CrudFieldComponent implements AfterViewInit, OnInit {
  routerService: RouterService = inject(RouterService);
  override async ngAfterViewInit(): Promise<void> {

    await super.ngAfterViewInit();
    if(this.name === 'productCode') {
      if(this.operation === OperationKeys.CREATE) {
        const producCode = this.routerService.getQueryParamValue('productCode');
        if(producCode) {
          this.value = producCode as string;
        }
      }
      if(this.value)
        windowEventEmitter(ComponentEventNames.CHANGE, {source: this.name, value: this.value});
    }

  }

  handleChange(event: SelectCustomEvent) {
    const {value} = event.detail as SelectChangeEventDetail;
    windowEventEmitter(ComponentEventNames.CHANGE, {source: this.name, value});
  }

  @HostListener('window:ChangeEvent', ['$event'])
  override async handleEvent(event: CustomEvent): Promise<void> {
    const { source, value } = event.detail;
    if(source !== this.name) {
      if(source === 'productCode' && this.name === 'batchNumber') {
        await this.handleProductQuery(value);
      }
      if(source === 'batchNumber') {
        if(this.name === 'productCode')
          await this.setProductValue(value);
        if(this.name === 'type')
          await this.filterTypeOptions(value !== "" ? 'batch' : 'product');
      }
    }
  }

  async handleProductQuery(uid: string) {
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
