import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, OnInit } from '@angular/core';
import { ForAngularComponentsModule } from '../../../lib/components/for-angular-components.module';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { ForAngularModel } from 'src/app/models/DemoModel';
import { ComponentsModule } from 'src/app/components/components.module';

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

  model1 = new ForAngularModel({
    name: 'John Doe',
    birthdate: new Date(),
    email: 'john.doe@example.com',
    website: 'https://johndoe.example.com',
    password: 'password123',
  });

  ngOnInit(): void {
    if(!this.operation)
      this.operation = OperationKeys.CREATE;
  }

  handleSubmit(event: Event): void {
    console.log(event);
  }
 }
