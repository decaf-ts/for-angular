import { model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import {
  uichild,
  uihandlers,
  uilayout,
  uilayoutprop,
  UIMediaBreakPoints,
  uimodel,
  uionrender,
  ComponentEventNames,
  TransactionHooks,
} from '@decaf-ts/ui-decorators';
import { getDocumentProperties, EpiHandler } from '../fabric/handlers/EpiHandler';
import { Leaflet } from '../fabric';
import { ProductHandler } from '../fabric/handlers/ProductHandler';
import { BatchForm } from '../fabric/forms/BatchForm';
import { BatchHandler } from '../fabric/handlers/BatchHandler';

@uimodel('', {})
@model()
class BatchEpiLayout {
  @uichild(Leaflet.name, 'ngx-decaf-list', getDocumentProperties('batchNumber'))
  @uionrender(() => EpiHandler)
  document!: Leaflet;
}

@uilayout('ngx-decaf-crud-form', true, 1, {
  borders: true,
  breakpoint: UIMediaBreakPoints.XLARGE,
})
@uihandlers({
  [ComponentEventNames.Submit]: BatchHandler,
  [TransactionHooks.BeforeUpdate]: BatchHandler,
  [TransactionHooks.BeforeCreate]: BatchHandler,
})
@model()
export class BatchLayout extends Model {
  @uichild(BatchForm.name, 'ngx-decaf-fieldset', {
    borders: false,
    required: true,
    breakpoint: UIMediaBreakPoints.XLARGE,
    ordenable: false,
  })
  @uilayoutprop(2)
  batch!: BatchForm;

  @uichild(BatchEpiLayout.name, 'app-switcher', {
    type: 'column',
    leafletParam: 'batchNumber',
  })
  @uilayoutprop(1)
  epi!: BatchEpiLayout;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<BatchLayout>) {
    super(args);
  }
}
