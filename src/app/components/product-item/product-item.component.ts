import { Component, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Dynamic, getModelAndRepository, KeyValue } from 'src/lib/engine';
import { IonBadge } from '@ionic/angular/standalone';
import { CrudOperations } from '@decaf-ts/db-decorators';
import { Condition } from '@decaf-ts/core';
import { Model } from '@decaf-ts/decorator-validation';
import { IconComponent, ListItemComponent } from 'src/lib/components';

@Dynamic()
@Component({
  selector: 'app-product-item',
  templateUrl: './product-item.component.html',
  styleUrls: ['./product-item.component.scss'],
  standalone: true,
  imports: [TranslatePipe, IonBadge, IconComponent],
})
export class AppProductItemComponent extends ListItemComponent implements OnInit {
  override async ngOnInit() {
    await super.ngOnInit();
    this.locale = 'product';
    this.item = this.model as KeyValue;
    const { productCode } = this.item;
    this.item['batches'] = await this.getProductBatchesTotal(productCode as string);
  }

  async getProductBatchesTotal(productCode: string): Promise<string> {
    const repo = getModelAndRepository('Batch');
    if (repo) {
      const { repository } = repo;
      const condition = Condition.attribute<Model>('productCode' as keyof Model).eq(productCode);
      const query = await repository.select().where(condition).execute();
      if (query) return `${query.length}`;
    }
    return '';
  }

  async handleClick(event: Event, action: CrudOperations, uid: string): Promise<void> {
    if (event instanceof Event) {
      event.stopImmediatePropagation();
    }
    await this.router.navigate([`/${this.route}/${action}/${uid}`]);
  }

  async filterBatches(event: Event, productCode: string): Promise<void> {
    event.stopImmediatePropagation();
    await this.router.navigate([`/batches`], {
      queryParams: {
        filter: 'productCode',
        value: productCode,
      },
    });
  }
}
