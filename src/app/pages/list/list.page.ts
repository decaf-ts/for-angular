import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ForAngularComponentsModule } from 'src/lib/components/for-angular-components.module';
import { ComponentsModule } from 'src/app/components/components.module';
import { faker } from '@faker-js/faker';
import { KeyValue } from 'src/lib/engine/types';
import { ListInfiniteComponent } from 'src/lib/components/list-infinite/list-infinite.component';
import { IonCard, IonCardContent, IonCardTitle, IonSearchbar } from '@ionic/angular/standalone';
import { formatDate } from 'src/lib/helpers/date';

@Component({
  selector: 'app-list',
  templateUrl: './list.page.html',
  styleUrls: ['./list.page.css'],
  standalone: true,
  imports: [ComponentsModule,  IonCard, IonCardTitle, IonCardContent, IonSearchbar],
})
export class ListPage implements OnInit {

  @ViewChild('listComponent')
  component!: ListInfiniteComponent;

  @Input()
  type?: 'infinite' | 'paginated';

  data!: KeyValue[];

  constructor() {}

  ngOnInit() {
    if(!this.type)
      this.type = 'infinite';
  }

  handleListRefreshEvent(items: KeyValue[]) {
    const self = this;
    if(items.length) {
      this.data = items.reduce((accum: KeyValue[], curr) => {
          accum.push(curr);
        return accum;
      }, [] as KeyValue[]);
    }
  }

  async refresh(){
    this.data = [];
    return await this.getData(100, {
      name: faker.person.fullName,
      occupation: faker.person.jobTitle,
      birthdate: faker.date.birthdate,
      hiredAt: faker.date.past
    });
  }

  handleListItemClick(event: Event, item: KeyValue) {
    console.log('Item clicked', event);
    console.log(item);
  }

  async getData(limit: number = 100, fakerObj: Record<string, Function>): Promise<KeyValue[]> {
    return new Promise((resolve) => {
      resolve(Array.from({ length: limit }, () => {
        const item: Record<string, any> = {};
        for (const [key, value] of Object.entries(fakerObj)) {
          const val = value();
          item[key] = val.constructor === Date? formatDate(val) : val;
        }
        return item;
      }))
    })
  }

}
