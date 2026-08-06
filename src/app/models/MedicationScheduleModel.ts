import { pk, table, column } from '@decaf-ts/core';
import { model, Model, ModelArg, required } from '@decaf-ts/decorator-validation';
import { HTML5InputTypes, uielement, uimodel, uilayout } from '@decaf-ts/ui-decorators';

@table('medication_schedules')
@uimodel('ngx-decaf-crud-form', { empty: { showButton: false } })
@uilayout('ngx-decaf-crud-form', true, 1, { empty: { showButton: false } })
@model()
export class MedicationScheduleModel extends Model {
  @pk({ type: String, generated: false })
  @uielement('ngx-decaf-crud-field', {
    label: 'medication_schedule.id.label',
    placeholder: 'medication_schedule.id.placeholder',
  })
  id!: string;

  @column()
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'medication_schedule.name.label',
    placeholder: 'medication_schedule.name.placeholder',
  })
  name!: string;

  @column()
  @required()
  @uielement('app-cron-selector-field', {
    label: 'medication_schedule.cron_expression.label',
    type: HTML5InputTypes.TEXT,
  })
  cronExpression!: string;

  constructor(model?: ModelArg<MedicationScheduleModel>) {
    super(model);
  }
}
