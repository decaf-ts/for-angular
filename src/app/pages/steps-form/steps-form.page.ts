import { Component, OnInit } from '@angular/core';
import { IonCard, IonContent } from '@ionic/angular/standalone';
import { KeyValue } from 'src/lib/engine/types';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { IBaseCustomEvent } from 'src/lib/engine';
import { getLogger } from 'src/lib/for-angular-common.module';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { ModelRendererComponent } from 'src/lib/components';
import { SteppedForm } from 'src/app/forms/SteppedForm';


@Component({
  standalone: true,
  selector: 'app-steps-form',
  templateUrl: './steps-form.page.html',
  styleUrls: ['./steps-form.page.scss'],
  imports: [HeaderComponent, ContainerComponent, ModelRendererComponent,  IonContent, IonCard]

})
export class StepsFormPage implements OnInit {

  title = 'Stepped Form Component';

  model!: SteppedForm;

  globals!: KeyValue;

  ngOnInit(): void {
    this.model = new SteppedForm({});
    this.globals = {operation: OperationKeys.CREATE};
  }

  handleSubmit(event: IBaseCustomEvent): void {
    getLogger(this).info(`Submit event: ${JSON.stringify(event)}`);
  }
}
