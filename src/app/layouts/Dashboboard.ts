import {
  model,
  Model,
  ModelArg,
} from '@decaf-ts/decorator-validation';
import { uichild, uilayoutitem, uielement, uilayout } from '@decaf-ts/ui-decorators';
import { CategoryModel } from '../models/CategoryModel';
import { EmployeeModel } from '../models/EmployeeModel';

@uilayout('ngx-decaf-layout', 2, ['Primeira Linha', 'Segunda Linha', 'Terceira Linha'])
@model()
export class DashboardLayout extends Model {

  @uielement('ngx-decaf-empty-state', {
    'title': 'Primeiro componente',
    'subtitle': 'Uma linha e 1 uma coluna',
  })
  @uilayoutitem(1, 1)
  left!: string;

  @uielement('ngx-decaf-empty-state', {subtitle: 'Subtítulo do segundo componente'})
  @uilayoutitem(2, 2, {
    title: 'Segundo componente'
  })
  right!: string;

  @uilayoutitem(2, 2)
  @uichild(EmployeeModel.name, 'ngx-decaf-crud-form')
  employee!: EmployeeModel;

  @uilayoutitem(2, 3)
  @uichild(CategoryModel.name, 'ngx-decaf-crud-form')
  category!: CategoryModel;

  @uielement('ngx-decaf-empty-state', { title: 'Segundo componente', subtitle: 'Subtítulo do segundo componente'})
  @uilayoutitem(2, 3)
  right2!: string;

  // @uilayoutitem(2, 3)
  // @uichild(ForAngularModel.name, 'ngx-decaf-crud-form')
  // demoModel!: ForAngularModel;

  constructor(args: ModelArg<DashboardLayout> = {}) {
    super(args);
  }
}
