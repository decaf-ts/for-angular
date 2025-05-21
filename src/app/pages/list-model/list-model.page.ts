import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ComponentsModule } from 'src/app/components/components.module';
import { faker } from '@faker-js/faker';
import { KeyValue, ModelRenderCustomEvent } from 'src/lib/engine/types';
import { ListInfiniteComponent } from 'src/lib/components/list-infinite/list-infinite.component';
import { IonCard, IonCardContent, IonCardTitle, IonSearchbar } from '@ionic/angular/standalone';
import { generateFakerData } from 'src/app/utils';
import { EmployeeModel } from 'src/app/models/EmployeeModel';
import { EventConstants } from 'src/lib/engine';
import { ListPaginatedComponent } from 'src/lib/components/list-paginated/list-paginated.component';

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

  model!: EmployeeModel;

  constructor() {}

  async ngOnInit() {
    if(!this.type)
      this.type = 'infinite';
    // this.data = await this.getData();
    this.model = new EmployeeModel({});
    // console.log(this.model)
  }

  handleEvent(event: ModelRenderCustomEvent) {
    const {name, data } = event;
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

  async refresh(){
    this.data = [];
    return await this.getData();
  }

  handleListItemClick(event: Event, item: KeyValue) {
  }

  async getData() {
    return await generateFakerData(100, {
      name: faker.person.fullName,
      occupation: faker.person.jobTitle,
      birthdate: faker.date.birthdate,
      hiredAt: faker.date.past
    });
  }
}
