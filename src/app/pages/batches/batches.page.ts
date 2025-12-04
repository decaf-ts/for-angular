import { Component, OnInit} from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { ListComponent } from 'src/lib/components/list/list.component';
import { NgxModelPageDirective } from 'src/lib/engine/NgxModelPageDirective';
import { CardComponent, EmptyStateComponent } from 'src/lib/components';
import { TranslatePipe } from '@ngx-translate/core';
import { IBaseCustomEvent } from 'src/lib/engine/interfaces';
import { BatchLayout } from 'src/app/ew/layouts/BatchLayout';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { Batch } from 'src/app/ew/models/Batch';
import { ProductLayoutHandler } from 'src/app/ew/handlers/ProductLayoutHandler';

@Component({
  selector: 'app-batches',
  templateUrl: './batches.page.html',
  styleUrls: ['./batches.page.scss'],
  standalone: true,
  imports: [IonContent, CardComponent, ModelRendererComponent, TranslatePipe, ListComponent, HeaderComponent, ContainerComponent, EmptyStateComponent],
})
export class BatchesPage  extends NgxModelPageDirective implements OnInit {
  // constructor() {
  //   super(true, getNgxToastComponent() as unknown as ToastController);
  // }

  override ngOnInit(): Promise<void> | void {
    super.ngOnInit();
    this.title = "batch.title";
    this.route = 'batches';
    this.model = !this.operation ? new Batch() : new BatchLayout();
    this.operations = [OperationKeys.READ, OperationKeys.CREATE, OperationKeys.UPDATE];
 }

  override async ionViewWillEnter(): Promise<void> {
   await super.ionViewWillEnter();
  }

  override async handleEvent(event: IBaseCustomEvent): Promise<void> {
    const handler = (new ProductLayoutHandler()).handle.bind(this);
    const result = await handler(event, 'batch', 'batchNumber');
    console.log(result);
  }
}
