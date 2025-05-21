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

@uimodel('ngx-decaf-crud-field', {
    label: 'demo.name.label',
    placeholder: 'demo.name.placeholder',
  })
@model()
export class CategoryModel extends FakerRepository<CategoryModel> {

  id!: number;

  name!: string;

  createdAt!: Date;

  constructor(args: ModelArg<CategoryModel>) {
    super('categories', args);
  }
}
