import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ComponentsModule } from 'src/app/components/components.module';
import { faker } from '@faker-js/faker';
import { KeyValue } from 'src/lib/engine/types';
import { IonCard, IonCardContent, IonCardTitle, IonSearchbar } from '@ionic/angular/standalone';
import { generateFakerData } from 'src/app/utils';
import { EmployeeModel } from 'src/app/models/EmployeeModel';
import { BaseCustomEvent, EventConstants } from 'src/lib/engine';
import { CategoryModel } from 'src/app/models/CategoryModel';
import { DecafRepository, ListComponentsTypes } from 'src/lib/components/list/constants';
import { Repository } from '@decaf-ts/core';
import { Constructor, Model, ModelConstructor } from '@decaf-ts/decorator-validation';

@Component({
  selector: 'app-list',
  templateUrl: './list.page.html',
  styleUrls: ['./list.page.css'],
  standalone: true,
  imports: [ComponentsModule,  IonCard, IonCardTitle, IonCardContent, IonSearchbar],
})
export class ListPage implements OnInit {

  @Input()
  type: ListComponentsTypes = ListComponentsTypes.INFINITE;

  data!: Model[];

  model!: CategoryModel | EmployeeModel;

  repository!: DecafRepository<Model>;

  constructor() {}

  ngOnInit() {
    if(!this.type)
      this.type = ListComponentsTypes.INFINITE;
    this.model = this.type === ListComponentsTypes.INFINITE ?
      new EmployeeModel() : new EmployeeModel();
    this.repository = Repository.forModel(this.model?.constructor as Constructor<Model>)
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
  }


  async refresh(): Promise<Model[]>{
    return this.repository.select().execute() || [];
  }

  handleListItemClick(event: Event, item: Model) {
    console.log(item);
    console.log(event);
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
