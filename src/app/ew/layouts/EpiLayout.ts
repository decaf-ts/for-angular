import {
  list,
  model,
  Model,
  ModelArg
} from "@decaf-ts/decorator-validation";
import { Condition } from "@decaf-ts/core";
import { uichild, uimodel, uionrender } from "@decaf-ts/ui-decorators";
import { FieldsetComponent, ListComponent } from "src/lib/components";
import { ProductEpiHandler } from "../handlers/ProductEpiHandler";
import { OperationKeys } from "@decaf-ts/db-decorators";


import { ProductStrength } from "../fabric/ProductStrength";
import { Leaflet } from "../fabric/Leaflet";
import { ProductMarket } from "../fabric/ProductMarket";

// import { ProductStrength, Leaflet, ProductMarket } from "@pharmaledgerassoc/ptp-toolkit/shared";

const commonProps = {
  borders: false,
  required: false,
  ordenable: false,
  multiple: true,
};

@uimodel('ngx-decaf-crud-form', {})
@model()
export class EpiLayout extends Model {

  @uichild(
    Leaflet.name,
    'ngx-decaf-list',
    {
      showSearchbar: false,
      title: 'Documents',
      operation: OperationKeys.READ,
      operations: [OperationKeys.READ],
      showRefresher: false,
      condition: Condition.attribute<Leaflet>('productCode'),
      route: 'leaflets',
      icon: 'ti-file-barcode',
      empty: {
          link: async function ()  {
          const component = this as ListComponent;
          const param = `${component.modelId ? `?productCode=${component.modelId}` : ''}`;
          await component.router.navigateByUrl(`/leaflets/create${param}`);
        }
      }
    },
  )
  @uionrender(() => ProductEpiHandler)
  document!: Leaflet;

  @list(ProductStrength, 'Array')
  @uichild(
    ProductStrength.name,
    'ngx-decaf-fieldset',
    {
      title: 'product.strengths.label',
      pk: 'substance',
      showTitle: false,
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
      // title: 'Markets',
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
