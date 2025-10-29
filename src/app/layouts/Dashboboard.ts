import {
  model,
  Model,
  ModelArg,
} from '@decaf-ts/decorator-validation';
import { uichild, uilayoutprop, uielement, uilayout } from '@decaf-ts/ui-decorators';
import { CategoryModel } from '../models/CategoryModel';
import { EmployeeModel } from '../models/EmployeeModel';

@uilayout('ngx-decaf-layout', 3, ['Title of first Line', 'Title of second Line', 'Title of third Line'])
@model()
export class DashboardLayout extends Model {

  @uielement('ngx-decaf-empty-state', {
    'title': 'First component - full width',
    'subtitle': 'Using all layout columns',
    'className': 'dcf-card-default'
  })
  @uilayoutprop(3, 1)
  left!: string;

  @uielement('ngx-decaf-empty-state')
  @uilayoutprop(2, 2)
  right!: string;

  @uilayoutprop(1, 2)
  @uichild(EmployeeModel.name, 'ngx-decaf-crud-form')
  employee!: EmployeeModel;

  @uilayoutprop(1, 3)
  @uichild(CategoryModel.name, 'ngx-decaf-crud-form')
  category!: CategoryModel;

  @uielement('ngx-decaf-empty-state', {
    title: 'Segundo componente',
    subtitle: 'Subtítulo do segundo componente',
    className: 'dcf-card-default'
  })
  @uilayoutprop(2, 3)
  right2!: string;

  constructor(args: ModelArg<DashboardLayout> = {}) {
    super(args);
  }
}
