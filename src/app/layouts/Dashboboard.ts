import {
  model,
  Model,
  ModelArg,
} from '@decaf-ts/decorator-validation';
import { uichild, uilayoutitem, uielement, uilayout } from '@decaf-ts/ui-decorators';
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
  @uilayoutitem(3, 1)
  left!: string;

  @uielement('ngx-decaf-empty-state')
  @uilayoutitem(2, 2, {
    title: 'Using two columns of second row',
    className: 'dcf-card-default'
  })
  right!: string;

  @uilayoutitem(1, 2)
  @uichild(EmployeeModel.name, 'ngx-decaf-crud-form')
  employee!: EmployeeModel;

  @uilayoutitem(1, 3)
  @uichild(CategoryModel.name, 'ngx-decaf-crud-form')
  category!: CategoryModel;

  @uielement('ngx-decaf-empty-state', {
    title: 'Segundo componente',
    subtitle: 'Subtítulo do segundo componente',
    className: 'dcf-card-default'
  })
  @uilayoutitem(2, 3)
  right2!: string;

  constructor(args: ModelArg<DashboardLayout> = {}) {
    super(args);
  }
}
