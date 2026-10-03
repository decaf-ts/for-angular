import { OperationKeys } from '@decaf-ts/db-decorators';
import { model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import { uichild, uielement, uilayout, uilayoutprop } from '@decaf-ts/ui-decorators';
import { CategoryModel } from '../models/CategoryModel';
import { EmployeeModel } from '../models/EmployeeModel';

@uilayout('ngx-decaf-layout', 3, ['Title of first Line', 'Title of second Line', 'Title of third Line'])
@model()
export class DashboardLayout extends Model {
  @uielement('ngx-decaf-empty-state', {
    title: 'First component - full width',
    subtitle: 'Using all layout columns',
  })
  @uilayoutprop('full', 1)
  main!: string;

  @uilayoutprop(3, 2)
  @uichild(EmployeeModel.name, 'ngx-decaf-crud-form')
  employee!: EmployeeModel;

  @uielement('ngx-decaf-empty-state', { match: true })
  @uilayoutprop(1, 3)
  employeeRight!: string;

  @uilayoutprop(1, 3)
  @uichild(CategoryModel.name, 'ngx-decaf-crud-form', { operation: OperationKeys.CREATE })
  category!: CategoryModel;

  @uielement('ngx-decaf-empty-state', {
    title: 'Segundo componente',
    subtitle: 'Subtítulo do segundo componente',
    className: 'dcf-card-default',
  })
  @uilayoutprop(1, 3)
  categoryRight!: string;

  constructor(args: ModelArg<DashboardLayout> = {}) {
    super(args);
  }
}
