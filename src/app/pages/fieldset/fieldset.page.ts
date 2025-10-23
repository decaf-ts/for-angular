import { Component, OnInit } from '@angular/core';
import { IonCard, IonContent } from '@ionic/angular/standalone';
import { FieldSetForm } from 'src/app/forms/FieldsetForm';
import { KeyValue } from 'src/lib/engine/types';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { IBaseCustomEvent, NgxBasePage } from 'src/lib/engine';
import { getLogger } from 'src/lib/for-angular-common.module';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { ModelRendererComponent } from 'src/lib/components';

@Component({
  standalone: true,
  selector: 'app-fieldset',
  templateUrl: './fieldset.page.html',
  styleUrls: ['./fieldset.page.scss'],
  imports: [HeaderComponent, ContainerComponent, ModelRendererComponent, IonContent, IonCard]
})
export class FieldsetPage extends NgxBasePage implements OnInit {


  globals!: KeyValue;

  // constructor() {
  //   super()
  // }

  ngOnInit(): void {
    this.model = new FieldSetForm({});
    this.globals = {operation: OperationKeys.CREATE, mamba: "joke"};
  }

  handleSubmit(event: IBaseCustomEvent): void {
    getLogger(this).info(`Submit event: ${JSON.stringify(event)}`);
  }
}
