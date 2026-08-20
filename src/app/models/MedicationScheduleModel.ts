import { column, pk } from '@decaf-ts/core';
import { model, Model, ModelArg, required } from '@decaf-ts/decorator-validation';
import { uielement, uilistmodel, uilistprop, uimodel } from '@decaf-ts/ui-decorators';

// @table('medication_schedules')
@uilistmodel('ngx-decaf-list-item', { icon: 'ti-cup' })
@uimodel('ngx-decaf-crud-form', { empty: { showButton: false } })
@model()
export class MedicationScheduleModel extends Model {
  @pk({ type: String, generated: false })
  @uielement('ngx-decaf-crud-field', {
    label: 'medication_schedule.id.label',
    placeholder: 'medication_schedule.id.placeholder',
  })
  @uilistprop('description')
  id!: string;

  @column()
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'medication_schedule.name.label',
    placeholder: 'medication_schedule.name.placeholder',
  })
  @uilistprop('title')
  name!: string;

  @column()
  @required()
  @uielement('app-cron-selector-field', {
    label: 'medication_schedule.cron_expression.label',
    allowEmpty: true,
    describeCron: true,
  })
  cronExpression!: string;

  constructor(model?: ModelArg<MedicationScheduleModel>) {
    super(model);
  }
}
