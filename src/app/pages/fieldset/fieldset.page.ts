import { Component, OnInit } from '@angular/core';
import { IonCard, IonCardContent } from '@ionic/angular/standalone';
import { ForAngularComponentsModule } from '../../../lib/components/for-angular-components.module';
import { ComponentsModule } from '../../components/components.module';
import { FieldSetForm } from 'src/app/forms/FieldsetForm';
import { KeyValue } from 'src/lib/engine/types';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { BaseCustomEvent } from 'src/lib/engine';
import { getLogger } from 'src/lib/for-angular.module';

@Component({
  standalone: true,
  selector: 'app-fieldset',
  templateUrl: './fieldset.page.html',
  styleUrls: ['./fieldset.page.scss'],
  imports: [ForAngularComponentsModule, ComponentsModule, IonCard, IonCardContent]
})
export class FieldsetPage implements OnInit {

  title = 'Fieldset Component';

  model!: FieldSetForm;

  globals!: KeyValue;

  ngOnInit(): void {
    this.model = new FieldSetForm({});
    this.globals = {operation: OperationKeys.CREATE,};
  }

  handleSubmit(event: BaseCustomEvent): void {
    getLogger(this).info(`Submit event: ${JSON.stringify(event)}`);
  }
}
