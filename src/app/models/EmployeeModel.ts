import { id } from '@decaf-ts/db-decorators';
import {
  date,
  model,
  Model,
  ModelArg,
} from '@decaf-ts/decorator-validation';
import { uielement, uimodel } from '@decaf-ts/ui-decorators';
import { ForAngularModel } from './DemoModel';
import { index, pk } from '@decaf-ts/core';
import { uilistmodel, listItemElement } from 'src/lib/engine';
import { FakerRepository } from '../utils/FakerRepository';

@uilistmodel('ngx-decaf-list-infinite', {'title': 'name', 'description': 'job', 'info': 'birthdate'})
@model()
export class EmployeeModel extends FakerRepository<EmployeeModel> {

  id!: number;

  @index()
  @uielement('ngx-decaf-list-item')
  name!: string;

  occupation!: string;

  birthdate!: Date;

  hiredAt!: Date;

  createdAt!: Date;

  constructor(args: ModelArg<EmployeeModel>) {
    super('employees', args);
  }
}
