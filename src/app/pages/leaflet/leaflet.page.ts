import { Component, OnInit } from '@angular/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { AppCardTitleComponent } from 'src/app/components/card-title/card-title.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { Leaflet } from 'src/app/ew/fabric/Leaflet';
import { TableComponent } from 'src/lib/components';
import { EmptyStateComponent } from 'src/lib/components/empty-state/empty-state.component';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { NgxModelPageDirective } from 'src/lib/engine';

@Component({
  selector: 'app-leaflet',
  templateUrl: './leaflet.page.html',
  styleUrls: ['./leaflet.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    AppCardTitleComponent,
    ModelRendererComponent,
    TranslatePipe,
    TableComponent,
    HeaderComponent,
    ContainerComponent,
    EmptyStateComponent,
  ],
})
export class LeafletPage extends NgxModelPageDirective implements OnInit {
  constructor() {
    super('leaflet');
  }

  async ngOnInit(): Promise<void> {
    this.title = 'leaflet.title';
    this.route = 'leaflets';
    this.model = new Leaflet();
    this.enableCrudOperations([OperationKeys.UPDATE]);
    await super.initialize();
  }

  override async ionViewWillEnter(): Promise<void> {
    await super.ionViewWillEnter();
    console.log(this._data);
    console.log(this.model);
  }
}
