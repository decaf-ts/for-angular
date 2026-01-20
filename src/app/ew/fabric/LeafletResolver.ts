import { model, type ModelArg, required } from "@decaf-ts/decorator-validation";
import { column, pk, table } from "@decaf-ts/core";
 import { description, uses } from "@decaf-ts/decoration";
import { Cacheable } from "./Cacheable";
// import { cache } from "@pharmaledgerassoc/ptp-toolkit/shared";

@description("Stores Leaflet resolver URL patterns for different Authorities")
//@uses(FabricFlavour)
@table("leaflet_resolver")
@model()
export class LeafletResolver extends Cacheable {
  //@cache()
  @pk({ type: String, generated: false })
  id!: string;

  //@cache()
  @description(
    "The full URL pattern for the Leaflet resolver where scan attributes can be replaced eg {gtin}, {batchNumber}, etc"
  )
  @column()
  @required()
  urlString!: string;

  constructor(arg?: ModelArg<LeafletResolver>) {
    super(arg);
  }
}
