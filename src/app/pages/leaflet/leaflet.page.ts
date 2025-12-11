import { Component, OnInit} from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { NgxModelPageDirective } from 'src/lib/engine';

import { OperationKeys } from '@decaf-ts/db-decorators';
import { CardComponent } from 'src/lib/components/card/card.component';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { ListComponent } from 'src/lib/components/list/list.component';
import { EmptyStateComponent } from 'src/lib/components/empty-state/empty-state.component';
import { Leaflet } from 'src/app/ew/models/Leaflet';

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
    ListComponent,
    HeaderComponent,
    ContainerComponent,
    EmptyStateComponent]
})
export class LeafletPage extends NgxModelPageDirective implements OnInit {


   override ngOnInit(): Promise<void> | void {
      super.ngOnInit();
      this.title = "leaflet.title";
      this.route = 'leaflets';
      this.model = new Leaflet();
      this.enableCrudOperations();
    }

    override async ionViewWillEnter(): Promise<void> {
     await super.ionViewWillEnter();
    }
}
