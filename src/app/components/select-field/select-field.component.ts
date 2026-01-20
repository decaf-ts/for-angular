import { Component, HostListener, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonButton,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonText,
  SelectChangeEventDetail,
  SelectCustomEvent,
} from '@ionic/angular/standalone';

import { FormGroup } from '@angular/forms';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { RouterService } from 'src/app/services/router.service';
import { Condition } from '@decaf-ts/core';
import { Model } from '@decaf-ts/decorator-validation';
import { Batch } from 'src/app/ew/fabric/Batch';
import { getDocumentTypes } from 'src/app/ew/utils/helpers';
import { Product } from 'src/app/ew/fabric/Product';
import { ForAngularCommonModule } from 'src/lib/for-angular-common.module';
import { IconComponent } from 'src/lib/components/icon/icon.component';
import { CrudFieldComponent } from 'src/lib/components/crud-field/crud-field.component';
import {
  getOnWindow,
  setOnWindow,
  windowEventEmitter,
} from 'src/lib/utils/helpers';
import { Dynamic } from 'src/lib/engine/decorators';
import { ComponentEventNames } from 'src/lib/engine/constants';
import { getModelAndRepository } from 'src/lib/engine/helpers';

@Dynamic()
@Component({
  selector: 'app-select-field',
  templateUrl: './select-field.component.html',
  styleUrls: ['./select-field.component.scss'],
  imports: [
    TranslatePipe,
    ForAngularCommonModule,
    IonItem,
    IonButton,
    IonLabel,
    IconComponent,
    IonText,
    IonSelect,
    IonSelectOption,
  ],

  standalone: true,
})
export class AppSelectFieldComponent extends CrudFieldComponent {
  routerService: RouterService = inject(RouterService);

  override async ngAfterViewInit(): Promise<void> {
    await super.ngAfterViewInit();

    if (this.name === 'productCode') {
      if (this.operation === OperationKeys.CREATE) {
        const producCode = this.routerService.getQueryParamValue('productCode');
        if (producCode) {
          this.value = producCode as string;
          this.readonly = true;
        }
      }
      if (this.value)
        windowEventEmitter(ComponentEventNames.Change, {
          source: this.name,
          value: this.value,
        });
    }

    if (this.name === 'batchNumber') {
      if (this.operation === OperationKeys.CREATE) {
        this.disabled = true;
        const batchNumber =
          this.routerService.getQueryParamValue('batchNumber');
        if (batchNumber) {
          this.value = batchNumber as string;
          if (this.formGroup instanceof FormGroup) this.formGroup?.enable();
          this.disabled = this.options?.length === 0;
        }
      }
      if ((this.value as string)?.length) {
        windowEventEmitter(ComponentEventNames.Change, {
          source: this.name,
          value: this.value,
        });
        this.disabled = false;
        if (this.formGroup instanceof FormGroup) this.formGroup?.enable();
      }
    }

    if (this.name === 'epiMarket' && !this.value) {
      if (this.formGroup instanceof FormGroup) {
        this.value = this.formGroup.get(this.name)?.value;
        this.changeDetectorRef.detectChanges();
      }
    }
  }

  handleChange(event: SelectCustomEvent) {
    const { value } = event.detail as SelectChangeEventDetail;
    windowEventEmitter(ComponentEventNames.Change, {
      source: this.name,
      value,
    });
  }

  @HostListener('window:ChangeEvent', ['$event'])
  override async handleEvent(event: CustomEvent): Promise<void> {
    const { source, value } = event.detail;
    if (source !== this.name) {
      if (source === 'productCode') {
        if (this.name === 'batchNumber')
          await this.readBatchByProductCode(value);
        if (['inventedName', 'nameMedicinalProduct'].includes(this.name)) {
          const product = await this.readProduct(value);
          if (product) {
            this.value = product[this.name as keyof Product] as string;
          }
        }
      }
      if (source === 'batchNumber') {
        if (this.name === 'epiMarket') {
          if (value !== '') this.value = '';
          this.hidden = value !== '';
          this.changeDetectorRef.detectChanges();
        }
        if (this.name === 'productCode' && value !== '')
          await this.setProductValue(value);
        if (this.name === 'type')
          await this.filterTypeOptions(value !== '' ? 'batch' : 'product');
      }
    }
  }

  async readProduct(uid: string): Promise<Product | undefined> {
    const context = getModelAndRepository('Product');
    let product = getOnWindow('_batchLastProduct') as Product | undefined;
    if (context) {
      const { repository } = context;
      if (!product || product.productCode !== uid) {
        this.value = '';
        product = (await repository.read(uid)) as Product & Model;
        if (product) {
          setOnWindow('_batchLastProduct', {
            inventedName: product.inventedName,
            nameMedicinalProduct: product.nameMedicinalProduct,
            productCode: product.productCode,
          } as Product);
        }
      }
    }
    return product;
  }

  async readBatchByProductCode(uid: string) {
    const relation = 'productCode' as keyof Model;
    const condition = Condition.attribute<Model>(relation).eq(uid);
    if (this.formGroup instanceof FormGroup) this.formGroup?.enable();
    const repo = getModelAndRepository('Batch');
    if (repo) {
      const { repository } = repo;
      const query = await repository.query(condition, relation);
      this.options = query;
      this.disabled = query?.length === 0;
      await this.getOptions();
    }
  }

  async setProductValue(batchId: string) {
    const repo = getModelAndRepository('Batch');
    if (repo && this.value) {
      const { repository, pk } = repo;
      const condition = Condition.attribute<Model>(pk as keyof Model)
        .eq(this.value)
        .or(
          Condition.attribute<Model>('batchNumber' as keyof Model).eq(batchId)
        );
      const query = await repository.select().where(condition).execute();
      const productCode = query?.length ? (query[0] as Batch).productCode : '';
      if (productCode !== this.value) {
        this.value = productCode as string;
      }
    }
  }

  async filterTypeOptions(type: 'product' | 'batch' = 'product') {
    const value = this.value;
    this.options = getDocumentTypes(type);
    await this.getOptions();
    this.value = value;
  }

  override handleClearValue(event: Event): void {
    super.handleClearValue(event);
    windowEventEmitter(ComponentEventNames.Change, {
      source: this.name,
      value: '',
    });
  }
}
