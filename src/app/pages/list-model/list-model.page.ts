import { Component, Input, OnInit } from '@angular/core';
import { Model } from '@decaf-ts/decorator-validation';
import { ComponentEventNames } from '@decaf-ts/ui-decorators';
import { IonContent } from '@ionic/angular/standalone';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { AIModel, AIVendorModel } from 'src/app/models/AIVendorModel';
import { CardComponent, ContainerComponent, ListComponent } from 'src/lib/components';
import { IBaseCustomEvent } from 'src/lib/engine';
import { NgxPageDirective } from 'src/lib/engine/NgxPageDirective';
import { KeyValue } from 'src/lib/engine/types';
@Component({
  selector: 'app-list-model',
  templateUrl: './list-model.page.html',
  styleUrls: ['./list-model.page.css'],
  standalone: true,
  imports: [HeaderComponent, IonContent, ContainerComponent, CardComponent, ListComponent],
})
export class ListModelPage extends NgxPageDirective implements OnInit {
  @Input()
  type?: 'infinite' | 'paginated';

  data!: KeyValue[];

  override model!: AIModel | AIVendorModel;

  constructor() {
    super('ListModelPage');
    this.title = 'List Component Example';
  }

  async ngOnInit() {
    await super.initialize();
    if (!this.type) this.type = 'infinite';
    this.model = this.type === 'paginated' ? new AIModel() : new AIVendorModel();
  }

  override async handleEvent(event: IBaseCustomEvent): Promise<void> {
    const { name, data } = event;
    if (name === ComponentEventNames.Refresh) return this.handleListRefreshEvent(data as Model[]);
  }

  handleListRefreshEvent(items: Model[]) {
    if (items.length) {
      this.data = items.reduce((accum: Model[], curr) => {
        accum.push(curr);
        return accum;
      }, [] as Model[]);
    }
  }
}
