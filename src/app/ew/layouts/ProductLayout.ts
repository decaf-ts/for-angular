import {
  model,
  Model,
  ModelArg
} from "@decaf-ts/decorator-validation";
import {  uichild, uilayout,  uilayoutprop, UIMediaBreakPoints } from "@decaf-ts/ui-decorators";
import { FieldsetComponent,  LayoutComponent } from "src/lib/components";
import { EpiLayout } from "./EpiLayout";
import { AppSwitcherComponent } from "../../components/switcher/switcher.component";
import { Product } from "../fabric";


@uilayout('ngx-decaf-crud-form', true, 1, {
  borders: true,
  breakpoint: UIMediaBreakPoints.XLARGE,
} as Partial<LayoutComponent>)
@model()
export class ProductLayout extends Model {

  @uichild(Product.name, 'ngx-decaf-fieldset', {
    title: 'product.section.details.title',
    borders: false,
    required: true,
    breakpoint: UIMediaBreakPoints.XLARGE,
    ordenable: false,
  } as Partial<FieldsetComponent>)
  @uilayoutprop(2)
  product!: Product;

  @uichild(EpiLayout.name, 'app-switcher', {type: 'column'} as Partial<AppSwitcherComponent>)
  @uilayoutprop(1)
  epi!: EpiLayout;

  // @uichild(Batch.name, 'ngx-decaf-fieldset', {
  //   title: 'product.section.batch.title',
  //   borders: false,
  //   required: false,
  //   breakpoint: UIMediaBreakPoints.XLARGE,
  //   ordenable: false,
  //   multiple: true,
  // } as Partial<FieldsetComponent>)
  // @uilayoutprop(3)
  // @hideOn(OperationKeys.CREATE, OperationKeys.UPDATE)
  // batch!: Product;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<ProductLayout>) {
    super(args);
  }
}
