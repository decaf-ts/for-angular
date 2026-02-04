import type { ModelArg } from '@decaf-ts/decorator-validation';
import { model, required } from '@decaf-ts/decorator-validation';
import { column, index, OrderDirection, pk, table } from '@decaf-ts/core';
// import { TableNames } from "@pharmaledgerassoc/ptp-toolkit/shared";
import { description, uses } from '@decaf-ts/decoration';
//  import { gtin } from "@pharmaledgerassoc/ptp-toolkit/shared";
import { Cacheable } from './Cacheable';
// import { cache } from "@pharmaledgerassoc/ptp-toolkit/shared";
import { uielement, uilayoutprop, uilistprop, uimodel, uiorder } from '@decaf-ts/ui-decorators';
import { TableNames } from './constants';

//@uses(FabricFlavour)
@table(TableNames.ProductStrength)
@model()
@uimodel('ngx-decaf-crud-form', { multiple: true })
@description('Represents the product’s strength and composition details.')
export class ProductStrength extends Cacheable {
  @description('Represents the product’s strength and composition details.')
  @pk()
  @description('Unique identifier of the product strength.')
  id!: number;

  // @manyToOne(
  //   () => Product,
  //   { update: Cascade.NONE, delete: Cascade.NONE },
  //   false
  // )
  //@gtin()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Product code associated with this strength entry.')
  productCode!: string;

  //@cache()
  @column()
  @required()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Product concentration or dosage (e.g., 500mg, 10%).')
  @uielement('ngx-decaf-crud-field', {
    label: 'substance.strength.label',
    placeholder: 'substance.strength.placeholder',
  })
  @uilayoutprop(1)
  @uilistprop('description')
  @uiorder(2)
  strength!: string;

  //@cache()
  @column()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Active substance related to this product strength.')
  @uielement('ngx-decaf-crud-field', {
    label: 'substance.name.label',
    placeholder: 'substance.name.placeholder',
  })
  @uilayoutprop(1)
  @uilistprop('title')
  @uiorder(1)
  substance?: string;

  //@cache()
  // @column()
  // @description("Legal entity name responsible for the product.")
  // legalEntityName?: string; //TODO: Check with tiago

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<ProductStrength>) {
    super(model);
  }
}
