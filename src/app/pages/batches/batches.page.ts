import { Component, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { NgxModelPageDirective } from 'src/lib/engine/NgxModelPageDirective';
import { EmptyStateComponent } from 'src/lib/components';
import { TranslatePipe } from '@ngx-translate/core';
import { ITabItem } from 'src/lib/engine/interfaces';
import { BatchLayout } from 'src/app/ew/layouts/BatchLayout';
import { Batch } from 'src/app/ew/fabric/Batch';
import { TableComponent } from 'src/lib/components/table/table.component';
import { EpiTabs } from 'src/app/ew/utils/constants';
import { AppCardTitleComponent } from 'src/app/components/card-title/card-title.component';
import { AppModalDiffsComponent } from 'src/app/components/modal-diffs/modal-diffs.component';
import { getModelAndRepository } from 'src/lib/engine';
import { BatchForm } from 'src/app/ew/fabric/forms/BatchForm';
import { ProductLayout } from 'src/app/ew/layouts/ProductLayout';
import { Model } from '@decaf-ts/decorator-validation';

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
    this.model = !this.operation ? new BatchForm() : new BatchLayout();
    this.enableCrudOperations([OperationKeys.DELETE]);
    // keep init after model selection
    this.locale = 'batch';
    this.title = `${this.locale}.title`;
    this.route = 'batches';
    await this.initialize();
    if (this.operation === OperationKeys.UPDATE) {
      console.log(this.model);
    }
  }

  // override async ionViewWillEnter(): Promise<void> {
  //   await super.ionViewWillEnter();
  // }

  // override async handleEvent(event: ICrudFormEvent): Promise<void> {
  //   const handler = (new ProductHandler()).handle.bind(this);
  //   await handler(event, 'Batch');
  // }
}
