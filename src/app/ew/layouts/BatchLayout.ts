import { model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import { pk } from '@decaf-ts/core';
import {
  uichild,
  uilayout,
  uilayoutprop,
  uilistmodel,
  UIMediaBreakPoints,
  uipageprop,
} from '@decaf-ts/ui-decorators';
import { EpiLayout } from '../layouts/EpiLayout';
import { FieldsetComponent, LayoutComponent } from 'src/lib/components';
import { Batch } from '../models/Batch';

@uilistmodel('ngx-decaf-list-item', { icon: 'cafe-outline' })
@uilayout('ngx-decaf-crud-form', true, 1, {
  borders: true,
  breakpoint: UIMediaBreakPoints.XLARGE,
} as LayoutComponent)
@model()
export class BatchLayout extends Model {
  @uipageprop(1)
  @uichild(Batch.name, 'ngx-decaf-fieldset', {
    title: 'batch.section.details.title',
    borders: false,
    required: true,
    ordenable: false,
  } as Partial<FieldsetComponent>)
  @uilayoutprop(2)
  batch!: Batch;

  @uilayoutprop(1)
  @uichild(EpiLayout.name, 'app-switcher', {})
  epi!: EpiLayout;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<BatchLayout>) {
    super(args);
  }
}
