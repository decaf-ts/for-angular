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
import { Batch } from '../fabric/Batch';
import { getDocumentProperties, ProductEpiHandler } from '../handlers/ProductEpiHandler';
import { Leaflet } from '../fabric';
import { ProductHandler } from '../handlers/ProductHandler';

@uimodel('', {})
@model()
class BatchEpiLayout {
  @uichild(Leaflet.name, 'ngx-decaf-list', getDocumentProperties('batchNumber'))
  @uionrender(() => ProductEpiHandler)
  document!: Leaflet;
}

@uilayout('ngx-decaf-crud-form', true, 1, {
  borders: true,
  breakpoint: UIMediaBreakPoints.XLARGE,
})
@uihandlers({
  [ComponentEventNames.Submit]: ProductHandler,
  [TransactionHooks.BeforeUpdate]: ProductHandler,
  [TransactionHooks.BeforeCreate]: ProductHandler,
})
@model()
export class BatchLayout extends Model {
  @uichild(Batch.name, 'ngx-decaf-fieldset', {
    borders: false,
    required: true,
    breakpoint: UIMediaBreakPoints.XLARGE,
    ordenable: false,
  })
  @uilayoutprop(2)
  batch!: Batch;

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
