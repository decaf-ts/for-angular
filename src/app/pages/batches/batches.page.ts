import { Component, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { NgxModelPageDirective } from 'src/lib/engine/NgxModelPageDirective';
import { EmptyStateComponent } from 'src/lib/components';
import { TranslatePipe } from '@ngx-translate/core';
import { ICrudFormEvent, ITabItem } from 'src/lib/engine/interfaces';
import { BatchLayout } from 'src/app/ew/layouts/BatchLayout';
import { Batch } from 'src/app/ew/fabric/Batch';
import { ProductHandler } from 'src/app/ew/handlers/ProductHandler';
import { TableComponent } from 'src/lib/components/table/table.component';
import { Product } from 'src/app/ew/fabric/Product';
import { SelectOption } from 'src/lib/engine/types';
import { EpiTabs } from 'src/app/ew/utils/constants';
import { ComponentEventNames } from 'src/lib/engine/constants';
import { getModelAndRepository } from 'src/lib/engine/helpers';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { AppCardTitleComponent } from 'src/app/components/card-title/card-title.component';
import { AppModalDiffsComponent } from 'src/app/components/modal-diffs/modal-diffs.component';

@Component({
  selector: 'app-batches',
  templateUrl: './batches.page.html',
  styleUrls: ['./batches.page.scss'],
  standalone: true,
  providers: [AppModalDiffsComponent],
  imports: [
    IonContent,
    ModelRendererComponent,
    TranslatePipe,
    HeaderComponent,
    ContainerComponent,
    AppCardTitleComponent,
    TableComponent,
    EmptyStateComponent,
  ],
})
export class BatchesPage extends NgxModelPageDirective implements OnInit {
  tabs: ITabItem[] = EpiTabs;

  constructor() {
    super('batch');
  }

  async ngOnInit(): Promise<void> {
    this.model = !this.operation ? new Batch() : new BatchLayout();
    this.enableCrudOperations([OperationKeys.DELETE]);
    // keep init after model selection
    this.locale = 'batch';
    this.title = `${this.locale}.title`;
    this.route = 'batches';
    await this.initialize();
  }

  // override async ionViewWillEnter(): Promise<void> {
  //   await super.ionViewWillEnter();
  // }

  // override async handleEvent(event: ICrudFormEvent): Promise<void> {
  //   const handler = (new ProductHandler()).handle.bind(this);
  //   await handler(event, 'Batch');
  // }
}
