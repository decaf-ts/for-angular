import { list, model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import { pk } from '@decaf-ts/core';
import { uichild, uimodel, uiorder, uipageprop } from '@decaf-ts/ui-decorators';
import { Leaflet } from '../models/Leaflet';
import { MarketForm } from './MarketForm';
import { SubstanceForm } from './SubstanceForm';
import { FieldsetComponent } from 'src/lib/components';

@uimodel('ngx-decaf-crud-form', {})
@model()
export class EpiLayout extends Model {
  @uipageprop(1)
  @list(Leaflet, 'Array')
  @uichild(
    Leaflet.name,
    'ngx-decaf-fieldset',
    {
      title: 'Documents',
      borders: false,
      required: false,
      rows: 1,
      cols: 2,
      ordenable: false,
    } as Partial<FieldsetComponent>,
    true
  )
  @uiorder(1)
  document!: Leaflet;

  @uipageprop(1)
  @uichild(
    SubstanceForm.name,
    'ngx-decaf-fieldset',
    {
      title: 'Strengths',
      borders: false,
      required: false,
    } as Partial<FieldsetComponent>,
    true
  )
  @uiorder(2)
  strengths!: SubstanceForm;

  @uipageprop(1)
  @uichild(
    MarketForm.name,
    'ngx-decaf-fieldset',
    {
      title: 'Markets',
      borders: false,
      required: false,
    } as Partial<FieldsetComponent>,
    true
  )
  @uiorder(3)
  markets!: MarketForm;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<EpiLayout>) {
    super(args);
  }
}
