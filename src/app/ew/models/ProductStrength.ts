import { pk } from "@decaf-ts/core";
import { Model, model, ModelArg, required } from "@decaf-ts/decorator-validation";
import { uielement, uilayoutprop, uilistprop, uimodel, uipageprop, uiprop } from "@decaf-ts/ui-decorators";
import { ListItemPositions } from "src/lib/engine/constants";

@uimodel('ngx-decaf-fieldset', {multiple: true})
@model()
export class ProductStrength extends Model {

  @pk({ type: Number})
  @uilistprop('uid')
  id!: number;

  //  @manyToOne(() => Product, {update: Cascade.NONE, delete: Cascade.NONE}, false)
  @uiprop()
  productCode!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'substance.name.label',
    placeholder: 'substance.name.placeholder',
  })
  @uilayoutprop(1)
  @uilistprop(ListItemPositions.title)
  name!: string;


  @uipageprop(1)
  @uielement('ngx-decaf-crud-field', {
    label: 'substance.strength.label',
    placeholder: 'substance.strength.placeholder',
  })
  @uilayoutprop(1)
  @uilistprop(ListItemPositions.description)
  strength!: string;

  legalEntityName?: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<ProductStrength>) {
    super(args);
  }
}
