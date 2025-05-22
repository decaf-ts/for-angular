import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ComponentsModule } from 'src/app/components/components.module';
import { KeyValue } from 'src/lib/engine/types';
import { ListInfiniteComponent } from 'src/lib/components/list-infinite/list-infinite.component';
import { IonCard, IonCardContent, IonCardTitle, IonSearchbar } from '@ionic/angular/standalone';
import { EmployeeModel } from 'src/app/models/EmployeeModel';
import { BaseCustomEvent, EventConstants } from 'src/lib/engine';
import { ListPaginatedComponent } from 'src/lib/components/list-paginated/list-paginated.component';
import { CategoryModel } from 'src/app/models/CategoryModel';

@Component({
  selector: 'app-list-model',
  templateUrl: './list-model.page.html',
  styleUrls: ['./list-model.page.css'],
  standalone: true,
  imports: [ComponentsModule,  IonCard, IonCardTitle, IonCardContent, IonSearchbar],
})
export class ListModelPage implements OnInit {


  @ViewChild('listComponent')
  component!: ListInfiniteComponent | ListPaginatedComponent;

  @Input()
  type?: 'infinite' | 'paginated';

  data!: KeyValue[];

  model!: EmployeeModel | CategoryModel;

  crudModel!: CategoryModel;

  constructor() {}

  async ngOnInit() {
    if(!this.type)
      this.type = 'infinite';
    this.model = this.type === 'infinite' ?
      new EmployeeModel() : new CategoryModel();
    // consoleInfo(this, JSON.stringify(this.model))
    this.crudModel = new CategoryModel({});
  }

  handleEvent(event: BaseCustomEvent) {
    const {name, data } = event;
    console.log(event);
    if(name === EventConstants.REFRESH_EVENT)
      return this.handleListRefreshEvent(data as KeyValue[]);
  }

  handleListRefreshEvent(items:  KeyValue[]) {
    if(items.length) {
      this.data = items.reduce((accum: KeyValue[], curr) => {
          accum.push(curr);
        return accum;
      }, [] as KeyValue[]);
    }
  }

  handleListItemClick(event: Event, item: KeyValue) {
  }

}
