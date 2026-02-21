import type { ModelArg } from '@decaf-ts/decorator-validation';
import { minlength, model, required } from '@decaf-ts/decorator-validation';
// import { gtin, TableNames } from "@pharmaledgerassoc/ptp-toolkit/shared";

import { Cascade, column, index, oneToMany, oneToOne, OrderDirection, pk } from '@decaf-ts/core';
// import {BlockOperations, OperationKeys, readonly} from "@decaf-ts/db-decorators";
import { description } from '@decaf-ts/decoration';
import { ProductMarket } from './ProductMarket';
import { ProductStrength } from './ProductStrength';
// import { assignProductOwner, audit } from "@pharmaledgerassoc/ptp-toolkit/shared";
import { ProductImage } from './ProductImage';
// import { cache } from "@pharmaledgerassoc/ptp-toolkit/shared";
import {
  HTML5InputTypes,
  uielement,
  uilayout,
  uilayoutprop,
  uilistmodel,
  uilistprop,
  uionrender,
} from '@decaf-ts/ui-decorators';
import { Cacheable } from './Cacheable';
import { gtin } from './gtin';
import { ProductHandler } from './handlers/ProductHandler';
import { audit } from './utils';

// @BlockOperations([OperationKeys.DELETE])
//@uses(FabricFlavour)

@uilistmodel('app-product-item', { icon: 'ti-package' })
@uilayout('ngx-decaf-crud-form', true, 1, { empty: { showButton: false } })
@model()
export class Product extends Cacheable {
  // //@cache()
  // @assignProductOwner()
  @audit()
  @pk({ type: String, generated: false })
  @gtin(['errors.gtin.digits', 'errors.gtin.checksum', 'errors.gtin.fallback'])
  @uilistprop('title')
  @uielement('ngx-decaf-crud-field', {
    label: 'product.productCode.label',
    updateOn: 'change',
    placeholder: 'product.productCode.placeholder',
    // readonly: () => {
    //   return (this as unknown as CrudFieldComponent).operation !== OperationKeys.CREATE;
    // },
  })
  @uilayoutprop(1)
  @uionrender(() => ProductHandler)
  productCode!: string;

  //@cache()
  @column()
  @required()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @uielement('ngx-decaf-crud-field', {
    label: 'product.inventedName.label',
    placeholder: 'product.inventedName.placeholder',
  })
  @uilistprop('title')
  @uilayoutprop(2)
  @minlength(2)
  inventedName!: string;

  //@cache()
  @column()
  @required()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @uielement('ngx-decaf-crud-field', {
    label: 'product.nameMedicinalProduct.label',
    placeholder: 'product.nameMedicinalProduct.placeholder',
  })
  @uilayoutprop(2)
  nameMedicinalProduct!: string;

  //@cache()
  @column()
  @uielement('ngx-decaf-crud-field', {
    label: 'product.internalMaterialCode.label',
    placeholder: 'product.internalMaterialCode.placeholder',
    type: 'textarea',
  })
  @uilayoutprop(1)
  @uilistprop('description')
  internalMaterialCode?: string;

  //@cache()
  @column()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @uielement('ngx-decaf-crud-field', {
    label: 'product.productRecall.label',
    placeholder: 'product.productRecall.placeholder',
    type: HTML5InputTypes.CHECKBOX,
  })
  @uilayoutprop(1)
  productRecall: boolean = false;

  @uielement('ngx-decaf-card', {
    title: 'product.section.image.title',
    name: 'separator',
    separator: true,
  })
  @uilayoutprop(1)
  productImageTitle!: string;

  //@cache()
  @oneToOne(
    () => ProductImage,
    {
      update: Cascade.CASCADE,
      delete: Cascade.CASCADE,
    },
    false
  )
  @uielement('ngx-decaf-file-upload', {
    label: 'product.productImage.label',
    type: 'text',
  })
  @uilayoutprop(1)
  @uionrender(() => ProductHandler)

  // @uionrender(() => ProductImageHandler)
  imageData?: ProductImage;

  //
  // @column()
  // flagEnableAdverseEventReporting?: boolean;
  //
  // @column()
  // adverseEventReportingURL?: string;
  //
  // @column()
  // flagEnableACFProductCheck?: boolean;
  //
  // @column()
  // @url()
  // acfProductCheckURL?: string;
  //
  // @column()
  // patientSpecificLeaflet?: string;
  //
  // @column()
  // healthcarePractitionerInfo?: string;
  //
  // @column()
  // counter?: number;

  //@cache()
  @oneToMany(() => ProductStrength, { update: Cascade.CASCADE, delete: Cascade.CASCADE }, true)
  strengths!: ProductStrength[];

  //@cache()
  @oneToMany(() => ProductMarket, { update: Cascade.CASCADE, delete: Cascade.CASCADE }, true)
  @description('GTIN code of the product')
  markets!: ProductMarket[];

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<Product>) {
    super(args);
  }
}
