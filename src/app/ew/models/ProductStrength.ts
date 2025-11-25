import { pk } from "@decaf-ts/core";
import { Model, model, ModelArg, required } from "@decaf-ts/decorator-validation";
import { uielement, uilayoutprop, uimodel, uipageprop, uiprop } from "@decaf-ts/ui-decorators";

@uimodel('ngx-decaf-fieldset', {multiple: true})
@model()
export class ProductStrength extends Model {

  @pk({type: "Number"})
  id!: number;

  //  @manyToOne(() => Product, {update: Cascade.NONE, delete: Cascade.NONE}, false)
  @uiprop()
  @uilayoutprop(1)
  productCode!: string

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'substance.name.label',
    placeholder: 'substance.name.placeholder',
  })
  @uilayoutprop(1)
  name!: string;


  @uipageprop(1)
  @uielement('ngx-decaf-crud-field', {
    label: 'substance.strength.label',
    placeholder: 'substance.strength.placeholder',
  })
  @uilayoutprop(1)
  strength!: string;

  legalEntityName?: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<ProductStrength>) {
    super(args);
  }
}
