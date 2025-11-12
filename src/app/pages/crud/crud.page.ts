import { Component, OnInit } from '@angular/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { NgxPageDirective } from 'src/lib/engine/NgxPageDirective';
import { ForAngularModel } from 'src/app/models/DemoModel';
import { IBaseCustomEvent } from 'src/lib/engine';
import { getLogger } from 'src/lib/for-angular-common.module';
import { IonContent } from '@ionic/angular/standalone';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { CardComponent } from 'src/lib/components';

@Component({
  selector: 'app-crud',
  templateUrl: './crud.page.html',
  styleUrls: ['./crud.page.css'],
  standalone: true,
  imports: [HeaderComponent, IonContent, ContainerComponent, CardComponent, ModelRendererComponent]
})
export class CrudPage extends NgxPageDirective implements OnInit {

  constructor() {
    super('Demo');
  }

  override async ngOnInit(): Promise<void> {
    if (!this.operation)
      this.operation = OperationKeys.CREATE;

    this.model = new ForAngularModel({
      id: 1,
      name: 'John Doe',
      gender: "male",
      // // birthdate: '1989-12-12',
      // email: 'john.doe@example.com',
      // website: 'https://johndoe.example.com',
      // password: 'password123',
      // ... ((this.operation === OperationKeys.READ || this.operation === OperationKeys.DELETE)?
      // {
      //   category: {name: "Demo Category", description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry."},
      //   user: {username: "Admin", secret: "DemoPass"},
      //   gender: "male",
      //   birthdate: "1989-12-12",
      //   contact: "morning",

      // }: {}),
    });

    this.globals = {
      operation: this.operation,
      uid: (this.operation === OperationKeys.DELETE ? (this.model as ForAngularModel).id : undefined),
    };
  }

  handleSubmit(event: IBaseCustomEvent): void {
    getLogger(this).info(`Submit event: ${JSON.stringify(event)}`);
  }
}
