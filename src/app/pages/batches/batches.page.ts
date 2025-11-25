import { Component, OnInit} from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { ListComponent } from 'src/lib/components/list/list.component';
import { NgxModelPageDirective } from 'src/lib/engine/NgxModelPageDirective';
import { CardComponent, EmptyStateComponent } from 'src/lib/components';
import { TranslatePipe } from '@ngx-translate/core';
import { IBaseCustomEvent, IModelPageCustomEvent } from 'src/lib/engine/interfaces';
import { BatchLayout } from 'src/app/ew/layouts/BatchLayout';

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
    this.title = "product.title";
    this.model = new BatchLayout();
 }

  override async ionViewWillEnter(): Promise<void> {
   await super.ionViewWillEnter();
  }

  override async handleEvent(event: IBaseCustomEvent): Promise<void> {
    const {success, message} = await super.handleSubmit(event) as IModelPageCustomEvent;
    // const toast = getNgxToastComponent({
    //   color: success ? 'dark' : 'danger',
    //   message,
    // });
    // await toast.show();
  }
}
