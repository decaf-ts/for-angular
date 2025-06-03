import { Component, Input, OnInit } from '@angular/core';
import { ForAngularComponentsModule } from '../../../lib/components/for-angular-components.module';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { ForAngularModel } from 'src/app/models/DemoModel';
import { ComponentsModule } from 'src/app/components/components.module';
import { BaseCustomEvent, KeyValue } from 'src/lib/engine';

@Component({
  selector: 'app-crud',
  templateUrl: './crud.page.html',
  styleUrls: ['./crud.page.css'],
  standalone: true,
  imports: [ForAngularComponentsModule, ComponentsModule],
})
export class CrudPage implements OnInit {

  title = 'Decaf-ts for-angular demo';

  @Input()
  protected readonly OperationKeys: CrudOperations = OperationKeys.CREATE;

  @Input()
  operation: CrudOperations = OperationKeys.CREATE;

  model = new ForAngularModel({
    id: 1,
    name: 'John Doe',
    birthdate: '1989-12-12',
    email: 'john.doe@example.com',
    website: 'https://johndoe.example.com',
    password: 'password123',
    category: undefined,
  });

  globals!: KeyValue;

  ngOnInit(): void {
    if (!this.operation)
      this.operation = OperationKeys.CREATE;
    this.globals = {
      operation: this.operation,
      uid: (this.operation === OperationKeys.DELETE ? this.model.id : undefined),
    };
  }

  handleSubmit(event: BaseCustomEvent): void {
    // const { data } = event;
  }
}
