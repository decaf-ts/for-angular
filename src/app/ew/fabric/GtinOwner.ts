import { column, index, OrderDirection, pk, table } from "@decaf-ts/core";
import type { ModelArg } from "@decaf-ts/decorator-validation";
import { model, required } from "@decaf-ts/decorator-validation";
// import { gtin } from "@pharmaledgerassoc/ptp-toolkit/shared";
// import { TableNames } from "@pharmaledgerassoc/ptp-toolkit/shared";
import { description, uses } from "@decaf-ts/decoration";
import { BlockOperations, OperationKeys } from "@decaf-ts/db-decorators";
import { Cacheable } from "./Cacheable";
import { TableNames } from "./constants";
// import { cache } from "@pharmaledgerassoc/ptp-toolkit/shared";

@description(
  "Model representing the owner of a GTIN (Global Trade Item Number)."
)
@BlockOperations([
  OperationKeys.CREATE,
  OperationKeys.UPDATE,
  OperationKeys.DELETE,
])
//@uses(FabricFlavour)
@table(TableNames.GtinOwner)
@model()
export class GtinOwner extends Cacheable {
  @pk()
  //@gtin()
  //@cache()
  @description("The product code associated with this GTIN owner.")
  productCode!: string;

  @column()
  //@cache()
  // @ownedBy()
  @required()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description("The owner of this GTIN. (Fabric's MSP ID of the MAH)")
  ownedBy!: string;

  constructor(model?: ModelArg<GtinOwner>) {
    super(model);
  }
}
