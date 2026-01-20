import { model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import {
  uichild,
  uilayout,
  uilayoutprop,
  UIMediaBreakPoints,
  uimodel,
  uionrender,
} from '@decaf-ts/ui-decorators';
import { Batch } from '../fabric/Batch';
import { getDocumentProperties, ProductEpiHandler } from '../handlers/ProductEpiHandler';
import { Leaflet } from '../fabric';

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
@model()
export class BatchLayout extends Model {
  @uichild(Batch.name, 'ngx-decaf-fieldset', {
    borders: false,
    required: true,
    breakpoint: UIMediaBreakPoints.XLARGE,
    ordenable: false,
  })
  @uilayoutprop(2)
  // @uionrender(() => BatchEpiLayoutHandler)
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
