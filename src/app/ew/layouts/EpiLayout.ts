import { list, model, Model, ModelArg, Primitives } from '@decaf-ts/decorator-validation';
import { uichild, uimodel, uiorder, uionrender,  DecafComponent } from '@decaf-ts/ui-decorators';
import { Leaflet } from '../models/Leaflet';
import { ProductMarket } from '../models/ProductMarket';
import { ProductStrength } from '../models/ProductStrength';
import { FieldsetComponent } from 'src/lib/components';
import { Condition } from '@decaf-ts/core';
import { DecafRepository } from 'src/lib/engine';
import { Metadata } from '@decaf-ts/decoration';
import { NgxEventHandler } from 'src/lib/engine/NgxEventHandler';
import { ProductEpiHandler } from '../handlers/ProductEpiHandler';

const commonProps = {
  borders: false,
  required: false,
  ordenable: false,
  multiple: true,
} as Partial<FieldsetComponent>;

@uimodel('ngx-decaf-crud-form', {})
@model()
export class EpiLayout extends Model {

  @list(Leaflet, 'Array')
  @uichild(
    Leaflet.name,
    'ngx-decaf-fieldset',
    {
      title: 'Documents',
      pk: 'lang',
      ...commonProps
    } as Partial<FieldsetComponent>,
    true
  )
  @uionrender(() => ProductEpiHandler)
  document!: Leaflet;

  @list(ProductStrength, 'Array')
  @uichild(
    ProductStrength.name,
    'ngx-decaf-fieldset',
    {
      title: 'Strengths',
      pk: 'name',
      ...commonProps
    } as Partial<FieldsetComponent>,
    true
  )
  @uionrender(() => ProductEpiHandler)
  strengths!: ProductStrength;

  @list(ProductMarket, 'Array')
  @uichild(
    ProductMarket.name,
    'ngx-decaf-fieldset',
    {
      title: 'Markets',
      pk: 'marketId',
      ...commonProps
    } as Partial<FieldsetComponent>,
    true
  )
  @uionrender(() => ProductEpiHandler)
  markets!: ProductMarket;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<EpiLayout>) {
    super(args);
  }
}
