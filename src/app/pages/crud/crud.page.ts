import { Component, Input, OnInit } from '@angular/core';
import { ForAngularComponentsModule } from '../../../lib/components/for-angular-components.module';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { ForAngularModel } from 'src/app/models/DemoModel';
import { ComponentsModule } from 'src/app/components/components.module';
import { BaseCustomEvent, KeyValue } from 'src/lib/engine';
import { getLogger } from 'src/lib/for-angular.module';
import { IonCard, IonCardContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-crud',
  templateUrl: './crud.page.html',
  styleUrls: ['./crud.page.css'],
  standalone: true,
  imports: [ForAngularComponentsModule, ComponentsModule, IonCard, IonCardContent],
})
export class CrudPage implements OnInit {

  title = 'Decaf-ts for-angular demo';

  @Input()
  protected readonly OperationKeys: CrudOperations = OperationKeys.CREATE;

  @Input()
  operation: CrudOperations = OperationKeys.CREATE;

  model!: ForAngularModel;

  globals!: KeyValue;

  ngOnInit(): void {
    if (!this.operation)
      this.operation = OperationKeys.CREATE;

    this.model = new ForAngularModel({
      id: 1,
      name: 'John Doe',
      // birthdate: '1989-12-12',
      email: 'john.doe@example.com',
      website: 'https://johndoe.example.com',
      password: 'password123',
      ... (this.operation === OperationKeys.READ ?
      {
        category: {name: "Demo Category", description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry."},
        user: {username: "Admin", secret: "DemoPass"},
        gender: "male",
        birthdate: "1989-12-12",

      }: {}),
    });

    this.globals = {
      operation: this.operation,
      uid: (this.operation === OperationKeys.DELETE ? this.model.id : undefined),
    };
  }

  handleSubmit(event: BaseCustomEvent): void {
    getLogger(this).info(`Submit event: ${JSON.stringify(event)}`);
  }
}
