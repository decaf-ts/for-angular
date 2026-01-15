import {
  model,
  Model,
  ModelArg
} from "@decaf-ts/decorator-validation";
import { uichild, uilayout,  uilayoutprop, UIMediaBreakPoints, uimodel, uionrender } from "@decaf-ts/ui-decorators";
import { FieldsetComponent,  LayoutComponent, ListComponent } from "src/lib/components";
import { Batch } from "../fabric/Batch";
import { ProductEpiHandler } from "../handlers/ProductEpiHandler";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { Condition } from "@decaf-ts/core";
import { Leaflet } from "../fabric";
import { BatchEpiLayoutHandler } from "../handlers/BatchEpiLayoutHandler";
import { AppSwitcherComponent } from "../../components/switcher/switcher.component";

@uimodel('ngx-decaf-crud-form', {})
@model()
class BatchEpiLayout {

    @uichild(
    Leaflet.name,
    'ngx-decaf-list',
    {
      showSearchbar: false,
      title: 'Documents',
      operation: OperationKeys.READ,
      operations: [OperationKeys.READ],
      showRefresher: false,
      condition: Condition.attribute<Leaflet>('batchNumber'),
      route: 'leaflets',
      icon: 'ti-file-barcode',
      empty: {
          link: async function ()  {
          const component = this as ListComponent;
          const param = `${component.modelId ? `?batchNumber=${component.modelId}` : ''}`;
          await component.router.navigateByUrl(`/leaflets/create${param}`);
        }
      }
    },
  )
  @uionrender(() => BatchEpiLayoutHandler)
  document!: Leaflet;

}

@uilayout('ngx-decaf-crud-form', true, 1, {
  borders: true,
  breakpoint: UIMediaBreakPoints.XLARGE
} as Partial<LayoutComponent>)
@model()
export class BatchLayout extends Model {

  @uichild(Batch.name, 'ngx-decaf-fieldset', {
    borders: false,
    required: true,
    breakpoint: UIMediaBreakPoints.XLARGE,
    ordenable: false,
  } as Partial<FieldsetComponent>)
  @uilayoutprop(2)
  @uionrender(() => BatchEpiLayoutHandler)
  batch!: Batch;



  @uichild(BatchEpiLayout.name, 'app-switcher', {type: 'column', leafletParam: 'batchNumber'} as Partial<AppSwitcherComponent>)
  @uilayoutprop(1)
  epi!: BatchEpiLayout;


  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<BatchLayout>) {
    super(args);
  }
}

