import { FabricIdentifiedModel } from "./FabricIdentifiedModel";
import { model, type ModelArg } from "@decaf-ts/decorator-validation";
import { Cascade, oneToMany, pk, table } from "@decaf-ts/core";
import { uses } from "@decaf-ts/decoration";
 import { PTPModuleFeature } from "./ModuleFeature";

//@uses(FabricFlavour)
@table("ptp-module")
@model()
export class PTPModule extends FabricIdentifiedModel {
  @pk({ type: String, generated: false })
  id!: string;

  @oneToMany(
    () => PTPModuleFeature,
    {
      update: Cascade.CASCADE,
      delete: Cascade.CASCADE,
    },
    true
  )
  features!: PTPModuleFeature[];

  constructor(arg?: ModelArg<PTPModule>) {
    super(arg);
  }
}
