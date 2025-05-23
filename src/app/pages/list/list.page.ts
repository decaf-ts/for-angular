import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ComponentsModule } from 'src/app/components/components.module';
import { faker } from '@faker-js/faker';
import { KeyValue } from 'src/lib/engine/types';
import { IonCard, IonCardContent, IonCardTitle, IonSearchbar } from '@ionic/angular/standalone';
import { generateFakerData } from 'src/app/utils';
import { EmployeeModel } from 'src/app/models/EmployeeModel';
import { BaseCustomEvent, EventConstants } from 'src/lib/engine';
import { CategoryModel } from 'src/app/models/CategoryModel';

@Component({
  selector: 'app-list',
  templateUrl: './list.page.html',
  styleUrls: ['./list.page.css'],
  standalone: true,
  imports: [ComponentsModule,  IonCard, IonCardTitle, IonCardContent, IonSearchbar],
})
export class ListPage implements OnInit {

  @Input()
  type?: 'infinite' | 'paginated';

  data!: KeyValue[];

  model!: CategoryModel | EmployeeModel;

  constructor() {}

  async ngOnInit() {
    if(!this.type)
      this.type = 'infinite';
    this.model = this.type === 'infinite' ?
      new EmployeeModel() : new CategoryModel();
  }

  ngOnDestroy() {
    this.data = [];
  }

  handleEvent(event: BaseCustomEvent) {
    const { name, data } = event;
    if(name === EventConstants.REFRESH_EVENT)
      return this.handleListRefreshEvent(event);
  }

  handleListRefreshEvent(event: BaseCustomEvent) {
     const { name, data } = event;
    if(data?.length)
      this.data = [... data];
    console.log(this.data);
  }

  async refresh(){
    this.data = [];
    return this.model.readAll();
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
