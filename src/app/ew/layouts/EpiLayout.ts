import { list, model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import { uichild, uimodel, uionrender } from '@decaf-ts/ui-decorators';
import { ProductMarket } from '../models/ProductMarket';
import { ProductStrength } from '../models/ProductStrength';
import { FieldsetComponent, ListComponent } from 'src/lib/components';
import { ProductEpiHandler } from '../handlers/ProductEpiHandler';
import { Leaflet } from '../models/Leaflet';
import { OperationKeys } from '@decaf-ts/db-decorators';

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
    'ngx-decaf-list',
    {
      showSearchbar: false,
      title: 'Documents',
      operation: OperationKeys.READ,
      operations: [OperationKeys.READ],
      route: 'leaflets',
      icon: 'ti-file-barcode',
      empty: {link: async function ()  {
        const component = this as ListComponent;
        const param = `${component.modelId ? `?productCode=${component.modelId}` : ''}`;
        await component.router.navigateByUrl(`/leaflets/create${param}`);
      }}
    },
  )
  @uionrender(() => ProductEpiHandler)
  document!: Leaflet;

  // @list(ProductStrength, 'Array')
  // @uichild(
  //   ProductStrength.name,
  //   'ngx-decaf-fieldset',
  //   {
  //     title: 'Strengths',
  //     pk: 'name',
  //     showTitle: false,
  //     ...commonProps
  //   } as Partial<FieldsetComponent>,
  //   true
  // )
  // @uionrender(() => ProductEpiHandler)
  // strengths!: ProductStrength;

  // @list(ProductMarket, 'Array')
  // @uichild(
  //   ProductMarket.name,
  //   'ngx-decaf-fieldset',
  //   {
  //     // title: 'Markets',
  //     ...commonProps
  //   } as Partial<FieldsetComponent>,
  //   true
  // )
  // @uionrender(() => ProductEpiHandler)
  // markets!: ProductMarket;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<EpiLayout>) {
    super(args);
  }
}
