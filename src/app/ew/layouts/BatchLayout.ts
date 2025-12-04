import { list, model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import {
  uichild,
  uilayout,
  uilayoutprop,
  UIMediaBreakPoints,
  uionrender,
} from '@decaf-ts/ui-decorators';
import { FieldsetComponent, LayoutComponent } from 'src/lib/components';
import { Batch } from '../models/Batch';
import { ProductEpiHandler } from '../handlers/ProductEpiHandler';
import { BatchLeaflet } from '../models/BatchLeaflet';

@uilayout('ngx-decaf-crud-form', true, 1, {
  borders: true,
  breakpoint: UIMediaBreakPoints.XLARGE
} as Partial<LayoutComponent>)
@model()
export class BatchLayout extends Model {

  @uichild(Batch.name, 'ngx-decaf-fieldset', {
    title: 'product.section.details.title',
    borders: false,
    required: true,
    breakpoint: UIMediaBreakPoints.XLARGE,
    ordenable: false,
  } as Partial<FieldsetComponent>)
  @uilayoutprop(2)
  @uionrender(() => ProductEpiHandler)
  batch!: Batch;

  @list(BatchLeaflet, 'Array')
  @uionrender(() => ProductEpiHandler)
  @uichild(
    BatchLeaflet.name,
    'ngx-decaf-fieldset',
    {
      title: 'Documents',
      borders: false,
      required: false,
      ordenable: false,
      multiple: true,
    } as Partial<FieldsetComponent>,
    true
  )
  @uilayoutprop(1)
  document!: BatchLeaflet;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<BatchLayout>) {
    super(args);
  }
}
