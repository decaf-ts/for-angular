import { Component, Input, OnInit } from '@angular/core';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { ForAngularModel } from 'src/app/models/DemoModel';
import { BaseCustomEvent, KeyValue } from 'src/lib/engine';
import { getLogger } from 'src/lib/for-angular-common.module';
import { IonCard, IonCardContent, IonContent } from '@ionic/angular/standalone';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { HeaderComponent } from 'src/app/components/header/header.component';

@Component({
  selector: 'app-crud',
  templateUrl: './crud.page.html',
  styleUrls: ['./crud.page.css'],
  standalone: true,
  imports: [ModelRendererComponent, HeaderComponent, ContainerComponent, IonContent, IonCard,  IonCardContent]
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
