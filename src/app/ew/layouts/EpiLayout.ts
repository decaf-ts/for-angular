import { list, model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import { uichild, uimodel, uiorder, uionrender, uipageprop } from '@decaf-ts/ui-decorators';
import { Leaflet } from '../models/Leaflet';
import { MarketForm } from '../forms/MarketForm';
import { SubstanceForm } from '../forms/SubstanceForm';
import { FieldsetComponent } from 'src/lib/components';
import { LeafletHandler } from 'src/app/handlers/LeafletHandler';

@uimodel('ngx-decaf-crud-form', {})
@model()
export class EpiLayout extends Model {

  @uipageprop(1)
  @list(Leaflet, 'Array')
  @uiorder(1)
  @uionrender(() => LeafletHandler)
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
