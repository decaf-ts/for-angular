import { Component, OnInit} from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { NgxModelPageDirective } from 'src/lib/engine';
import { CardComponent } from 'src/lib/components/card/card.component';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { EmptyStateComponent } from 'src/lib/components/empty-state/empty-state.component';
import { Leaflet } from 'src/app/ew/fabric/Leaflet';
import { TableComponent } from 'src/lib/components';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { AppCardTitleComponent } from 'src/app/components/card-title/card-title.component';

@Component({
  selector: 'app-leaflet',
  templateUrl: './leaflet.page.html',
  styleUrls: ['./leaflet.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CardComponent,
    AppCardTitleComponent,
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

  constructor() {
    super('leaflet');
  }

  override async  ngOnInit(): Promise<void>  {
    this.title = 'leaflet.title';
    this.route = 'leaflets';
    this.model = new Leaflet();
    this.enableCrudOperations([OperationKeys.UPDATE]);
    await super.ngOnInit();
    console.log(this.operation);
  }

  override async ionViewWillEnter(): Promise<void> {
    await super.ionViewWillEnter();
  }

}
