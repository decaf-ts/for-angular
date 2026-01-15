import { type ModelArg, url } from "@decaf-ts/decorator-validation";
import { model } from "@decaf-ts/decorator-validation";
import { column, pk, table } from "@decaf-ts/core";
 import { uses } from "@decaf-ts/decoration";
import { FabricIdentifiedModel } from "./FabricIdentifiedModel";

// @BlockOperations([OperationKeys.DELETE])
//@uses(FabricFlavour)
@table("entity")
@model()
export class Entity extends FabricIdentifiedModel {
  @pk({ type: String, generated: false })
  id!: string;

  @url()
  @column()
  endpoint!: string;

  constructor(args?: ModelArg<Entity>) {
    super(args);
  }
}
