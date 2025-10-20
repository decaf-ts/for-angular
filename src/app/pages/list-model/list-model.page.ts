import { Component, Input, OnInit } from '@angular/core';
import { KeyValue } from 'src/lib/engine/types';
import { IonCard, IonCardContent, IonContent } from '@ionic/angular/standalone';
import { IBaseCustomEvent, EventConstants } from 'src/lib/engine';
import { Model } from '@decaf-ts/decorator-validation';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { ListComponent } from 'src/lib/components';
import { AIModel, AIVendorModel } from 'src/app/models/AIVendorModel';
@Component({
  selector: 'app-list-model',
  templateUrl: './list-model.page.html',
  styleUrls: ['./list-model.page.css'],
  standalone: true,
  imports: [HeaderComponent, ContainerComponent, ListComponent, IonContent, IonCard, IonCardContent],
})
export class ListModelPage implements OnInit {

  @Input()
  type?: 'infinite' | 'paginated';

  data!: KeyValue[];

  model!: AIModel | AIVendorModel;

  async ngOnInit() {
    if(!this.type)
      this.type = 'infinite';
    this.model = this.type === 'infinite' ?
      new AIModel() : new AIVendorModel();
  }

  handleEvent(event: IBaseCustomEvent) {
    const {name, data } = event;
    if(name === EventConstants.REFRESH)
      return this.handleListRefreshEvent(data as Model[]);

  }

  handleListRefreshEvent(items:  Model[]) {
    if(items.length) {
      this.data = items.reduce((accum: Model[], curr) => {
          accum.push(curr);
        return accum;
      }, [] as Model[]);
    }
  }
}
