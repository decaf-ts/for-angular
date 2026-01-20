import { description, uses } from '@decaf-ts/decoration';
import { column, pk, table } from '@decaf-ts/core';
// import { TableNames } from "@pharmaledgerassoc/ptp-toolkit/shared";
import { model, type ModelArg, required } from '@decaf-ts/decorator-validation';
// import { gtin } from "@pharmaledgerassoc/ptp-toolkit/shared";
import { Cacheable } from './Cacheable';
import { TableNames } from './constants';
import { uilayout } from '@decaf-ts/ui-decorators';
// import { cache } from "@pharmaledgerassoc/ptp-toolkit/shared";

@description('Links a product to a specific market.')
//@uses(FabricFlavour)
@table(TableNames.ProductImage)
@uilayout('ngx-decaf-crud-form', true, 1, { empty: { showButton: false } })
@model()
export class ProductImage extends Cacheable {
  //@gtin()
  @pk({ type: String, generated: false })
  @description('Unique identifier composed of product code and market ID.')
  productCode!: string;

  //@cache()
  @column()
  @required()
  @description('image content in base64')
  content!: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<ProductImage>) {
    super(model);
  }
}
