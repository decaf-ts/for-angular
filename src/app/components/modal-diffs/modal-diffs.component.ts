import { Component, Input, OnInit } from '@angular/core';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { Comparison, formatDate, isValidDate, Model } from '@decaf-ts/decorator-validation';
import { IonButton } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { getExpiryDateDiffValue } from 'src/app/ew/fabric/handlers/BatchHandler';
import { Diffs } from 'src/app/ew/fabric/helpers/comparison';
import { ProductImage } from 'src/app/ew/fabric/ProductImage';
import { ModalComponent } from 'src/lib/components';
import { ActionRoles } from 'src/lib/engine/constants';
import { Dynamic } from 'src/lib/engine/decorators';
import { KeyValue } from 'src/lib/engine/types';
import { ForAngularCommonModule } from 'src/lib/for-angular-common.module';
import { isValidBase64 } from 'src/lib/utils';

@Dynamic()
@Component({
  selector: 'app-modal-diffs',
  templateUrl: './modal-diffs.component.html',
  styleUrls: ['./modal-diffs.component.scss'],
  imports: [TranslatePipe, ForAngularCommonModule, IonButton],
  standalone: true,
})
export class AppModalDiffsComponent extends ModalComponent implements OnInit {
  @Input()
  diffs: Partial<Diffs<Model> | Comparison<Model>> = {};

  @Input()
  override locale?: string;

  @Input()
  override operation: CrudOperations = OperationKeys.CREATE;

  @Input()
  confirmButton = {
    text: 'continue',
    handle: () => this.handleAction('confirm'),
  };

  filteredDiffs: KeyValue = {};

  override async ngOnInit(): Promise<void> {
    const entries = Object.entries(this.diffs);
    for (const [k, v] of entries) {
      const propName = k as keyof Model;
      let o = v?.old || v?.other;
      let n = v?.new || v?.current;
      o = await this.parseValue(k, o, this);
      n = await this.parseValue(k, n, this);

      if (o || n) {
        this.filteredDiffs[propName] = {
          old: o,
          new: n,
        };
      }
    }
    await super.ngOnInit();
  }

  parseLabel(key: string): Promise<string> {
    const [prop] = key.split('_');
    return this.translateService.instant(`${this.locale}.${prop}.label`);
  }

  async parseValue(
    prop: string,
    value: string | object | Date | number | undefined,
    instance: AppModalDiffsComponent
  ): Promise<string | object | undefined> {
    if (prop === 'expiryDate') {
      return await getExpiryDateDiffValue(value as Date | string, instance);
    }
    if (prop === 'imageData' && value) {
      const { content } = value as ProductImage;
      let image = JSON.parse(content || '{}');
      if (image) {
        if (Array.isArray(image)) {
          image = image[0];
        }
      }
      if (isValidBase64(image)) {
        const base64Data = JSON.parse((value as ProductImage).content) || undefined;
        if (base64Data) {
          return `<img src="${base64Data?.[0]}" alt="Product Image" style="max-height: 50px;" />`;
        }
      } else {
        return undefined;
      }
    }
    if (typeof value === 'object') {
      const isDate = isValidDate(value);
      if (!isDate && !Object.keys(value).length) {
        return '';
      }
      // return isDate ? formatDate(value as Date, 'dd/MM/yyyy') : value;
      return isDate ? formatDate(value as Date, 'dd/MM/yyyy') : JSON.stringify(value);
    }
    return value === undefined || value === null ? '' : String(value);
  }

  async handleAction(role: 'cancel' | 'confirm' = 'confirm'): Promise<void> {
    if (role === ActionRoles.cancel) {
      return await this.cancel();
    }
    return await this.confirm();
  }
}
