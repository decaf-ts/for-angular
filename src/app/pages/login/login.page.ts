import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, OnInit } from '@angular/core';
import { ForAngularComponentsModule } from 'src/lib/components/for-angular-components.module';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { ForAngularModel } from 'src/app/models/DemoModel';
import { ComponentsModule } from 'src/app/components/components.module';
import { BaseCustomEvent } from 'src/lib/engine';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.css'],
  standalone: true,
  imports: [ForAngularComponentsModule, ComponentsModule],
})
export class LoginPage implements OnInit {

  title = 'Decaf-ts for-angular demo';

    @Input()
    protected readonly OperationKeys: CrudOperations = OperationKeys.CREATE;

    @Input()
    operation: CrudOperations = OperationKeys.CREATE;

    model1 = new ForAngularModel({
      name: 'John Doe',
      birthdate: '1989-12-12',
      email: 'john.doe@example.com',
      website: 'https://johndoe.example.com',
      password: 'password123',
    });

    ngOnInit(): void {
      if(!this.operation)
        this.operation = OperationKeys.CREATE;
    }

    handleSubmit(event: BaseCustomEvent): void {
      const {data} = event;
    }

}
