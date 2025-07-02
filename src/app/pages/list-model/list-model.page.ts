import { Component, Input, OnInit } from '@angular/core';
import { ComponentsModule } from 'src/app/components/components.module';
import { KeyValue } from 'src/lib/engine/types';
import { IonCard, IonCardContent, IonCardTitle, IonSearchbar } from '@ionic/angular/standalone';
import { EmployeeModel } from 'src/app/models/EmployeeModel';
import { BaseCustomEvent, EventConstants } from 'src/lib/engine';
import { CategoryModel } from 'src/app/models/CategoryModel';
import { Model } from '@decaf-ts/decorator-validation';

@Component({
  selector: 'app-list-model',
  templateUrl: './list-model.page.html',
  styleUrls: ['./list-model.page.css'],
  standalone: true,
  imports: [ComponentsModule,  IonCard, IonCardTitle, IonCardContent, IonSearchbar],
})
export class ListModelPage implements OnInit {

  @Input()
  type?: 'infinite' | 'paginated';

  data!: KeyValue[];

  model!: EmployeeModel | CategoryModel;

  async ngOnInit() {
    if(!this.type)
      this.type = 'infinite';
    this.model = this.type === 'infinite' ?
      new EmployeeModel() : new CategoryModel();
  }

  handleEvent(event: BaseCustomEvent) {
    const {name, data } = event;
    if(name === EventConstants.REFRESH_EVENT)
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
