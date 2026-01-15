import { Component, OnInit} from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { NgxModelPageDirective } from 'src/lib/engine/NgxModelPageDirective';
import { EmptyStateComponent } from 'src/lib/components';
import { TranslatePipe } from '@ngx-translate/core';
import { ICrudFormEvent, ITabItem } from 'src/lib/engine/interfaces';
import { BatchLayout } from 'src/app/ew/layouts/BatchLayout';
import { Batch } from 'src/app/ew/models/Batch';
import { ProductLayoutHandler } from 'src/app/ew/handlers/ProductLayoutHandler';
import { TableComponent } from 'src/lib/components/table/table.component';
import { Product } from 'src/app/ew/models/Product';
import { getModelAndRepository } from 'src/lib/for-angular-common.module';
import { SelectOption } from 'src/lib/engine/types';
import { EpiTabs } from 'src/app/ew/constants';
import { ComponentEventNames } from 'src/lib/engine/constants';

@Component({
  selector: 'app-batches',
  templateUrl: './batches.page.html',
  styleUrls: ['./batches.page.scss'],
  standalone: true,
  imports: [IonContent, TableComponent, ModelRendererComponent, TranslatePipe, HeaderComponent, ContainerComponent, EmptyStateComponent],
})
export class BatchesPage  extends NgxModelPageDirective implements OnInit {

  tabs: ITabItem[] = EpiTabs;

  products: SelectOption[] = [];

  constructor() {
    super("batch");
  }

  override async ngOnInit(): Promise<void> {
    this.model = !this.operation ? new Batch() : new BatchLayout();
    this.enableCrudOperations();
    await super.ngOnInit();
    this.title = "batch.title";
    this.route = 'batches';
    await this.getProducts();
  }

  async getProducts(): Promise<void> {
    const repo = getModelAndRepository("product");
    if(repo) {
      const {repository} = repo;
      const query = await repository.select().execute() as Product[];
      if(query?.length) {
        this.products = query.map((item: Product) => ({
          text: `${item.inventedName}`,
          value: item.productCode
        }));
      }
    }
  }

  override async ionViewWillEnter(): Promise<void> {
   await super.ionViewWillEnter();
  }

  override async handleEvent(event: ICrudFormEvent): Promise<void> {
    const {name} = event;
    if(name === ComponentEventNames.SUBMIT) {
      const handler = (new ProductLayoutHandler()).handle.bind(this);
      await handler(event);
    }
  }
}
