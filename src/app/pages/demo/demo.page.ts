import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, OnInit } from '@angular/core';
import { ComponentsModule } from '../../../lib/components/components.module';
// import { IonicModule } from '@ionic/angular';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import {getFormFieldProps} from 'src/app/utils';
import { ForAngularModel } from 'src/app/model/DemoModel';

const now = new Date();
const lastWeek = new Date();
const nextWeek = new Date();
lastWeek.setDate(lastWeek.getDate() - 7);
nextWeek.setDate(lastWeek.getDate() + 7);

@Component({
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [ComponentsModule],
  selector: 'for-angular-demo',
  templateUrl: './demo.page.html',
  styleUrls: ['./demo.page.scss'],
})
export class DemoPage implements OnInit {

  title = 'Decaf-ts for-angular demo';

  @Input()
  protected readonly OperationKeys: CrudOperations = OperationKeys.CREATE;

  operation: CrudOperations = OperationKeys.CREATE;

  props1 = getFormFieldProps('1', 'text');
  props2 = Object.assign({}, getFormFieldProps('2', 'text'), {
    minlength: 10,
    maxlength: 15,
  });
  props3 = Object.assign({}, getFormFieldProps('3', 'number', 10), {
    required: false,
    min: 15,
    max: 25,
    step: 5,
  });
  props4 = Object.assign({}, getFormFieldProps('4', 'date', now), {
    min: lastWeek,
    max: nextWeek,
  });
  props5 = Object.assign({}, getFormFieldProps('5', 'select', ''));

  model1 = new ForAngularModel({
    name: 'John Doe',
    birthdate: now,
    email: 'john.doe@example.com',
    website: 'https://johndoe.example.com',
    password: 'password123',
  });

  ngOnInit(): void {
      console.log("Init Demo page");
  }
}
