import { FabricIdentifiedModel } from "./FabricIdentifiedModel";
import { model, type ModelArg, required } from "@decaf-ts/decorator-validation";
import { column, index, OrderDirection, pk, table } from "@decaf-ts/core";
import { description, uses } from "@decaf-ts/decoration";
 import { composed } from "@decaf-ts/db-decorators";

@description("Represents a feature of a PTP module.")
//@uses(FabricFlavour)
@table("ptp-module-feature")
@model()
export class PTPModuleFeature extends FabricIdentifiedModel {
  @composed(["module", "name"], ":")
  @pk({ type: String, generated: false })
  id!: string;

  @column()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @required()
  name!: string;

  @column()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @required()
  module!: string;

  constructor(arg?: ModelArg<PTPModuleFeature>) {
    super(arg);
  }
}
