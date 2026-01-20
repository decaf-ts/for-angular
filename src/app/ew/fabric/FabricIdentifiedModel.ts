import { type ModelArg } from "@decaf-ts/decorator-validation";
import { createdBy, index, OrderDirection, updatedBy } from "@decaf-ts/core";
 import { uses } from "@decaf-ts/decoration";
import { FabricBaseModel } from "./FabricBaseModel";

//@uses(FabricFlavour)
export class FabricIdentifiedModel extends FabricBaseModel {
  @createdBy()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  createdBy!: string;
  @updatedBy()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  updatedBy!: string;

  constructor(arg?: ModelArg<FabricIdentifiedModel>) {
    super(arg);
  }
}
