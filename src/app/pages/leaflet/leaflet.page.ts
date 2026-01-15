import { Component, OnInit} from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { ComponentEventNames, NgxModelPageDirective } from 'src/lib/engine';
import { CardComponent } from 'src/lib/components/card/card.component';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { EmptyStateComponent } from 'src/lib/components/empty-state/empty-state.component';
import { Leaflet } from 'src/app/ew/models/Leaflet';
import { IBaseCustomEvent, IModelComponentSubmitEvent } from 'src/lib/engine/interfaces';
import { getNgxToastComponent } from 'src/app/utils/NgxToastComponent';
import { TableComponent } from 'src/lib/components';

@Component({
  selector: 'app-leaflet',
  templateUrl: './leaflet.page.html',
  styleUrls: ['./leaflet.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CardComponent,
    ModelRendererComponent,
    CardComponent,
    TranslatePipe,
    TableComponent,
    HeaderComponent,
    ContainerComponent,
    EmptyStateComponent
  ]
})
export class LeafletPage extends NgxModelPageDirective implements OnInit {


  override async ngOnInit(): Promise<void>   {
    await super.ngOnInit();
    this.title = "leaflet.title";
    this.route = 'leaflets';
    this.model = new Leaflet();
    this.enableCrudOperations();
  }

  override async ionViewWillEnter(): Promise<void> {
    await super.ionViewWillEnter();
  }

  override async handleEvent(event: IBaseCustomEvent): Promise<void> {
    const {name} = event;
    if (name === ComponentEventNames.SUBMIT) {
      const {success, message} = await super.submit(event, true) as IModelComponentSubmitEvent;
      const toast = await getNgxToastComponent().show({
        message,
        duration: 3000,
        color: success ? 'dark' : 'danger',
        position: 'top',
      });
      await toast.present();
    }
  }
}
