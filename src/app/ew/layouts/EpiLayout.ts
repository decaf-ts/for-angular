import { list, model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import { uichild, uimodel, uionrender } from '@decaf-ts/ui-decorators';
import { Leaflet } from '../models/Leaflet';
import { ProductMarket } from '../models/ProductMarket';
import { ProductStrength } from '../models/ProductStrength';
import { FieldsetComponent } from 'src/lib/components';
import { ProductEpiHandler } from '../handlers/ProductEpiHandler';



@uimodel('', {})
@model()
export class EpiLayout extends Model {

  // @list(Leaflet, 'Array')
  // @uichild(
  //   Leaflet.name,
  //   'ngx-decaf-crud-form',
  //   {
  //     title: 'Documents',
  //   } as Partial<FieldsetComponent>,
  // )
  // @uionrender(() => ProductEpiHandler)
  // document!: Leaflet;

  @list(ProductStrength, 'Array')
  @uichild(
    ProductStrength.name,
    'ngx-decaf-crud-form',
    {
      title: 'Strengths',
    } as Partial<FieldsetComponent>,
    true
  )
  @uionrender(() => ProductEpiHandler)
  strengths!: ProductStrength;

  @list(ProductMarket, 'Array')
  @uichild(
    ProductMarket.name,
    'ngx-decaf-crud-form',
    {
      title: 'Markets',
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
