import type { ModelArg } from "@decaf-ts/decorator-validation";
import { model, required } from "@decaf-ts/decorator-validation";
import { column, index, OrderDirection, pk, table } from "@decaf-ts/core";
// import { TableNames } from "@pharmaledgerassoc/ptp-toolkit/shared";
import { description, uses } from "@decaf-ts/decoration";
 import { composed } from "@decaf-ts/db-decorators";
// import { cache } from "@pharmaledgerassoc/ptp-toolkit/shared";
import { Cacheable } from "./Cacheable";
import { TableNames } from "./constants";

@description(
  "Represents an additional file associated with a leaflet, such as a PDF or image."
)
//@uses(FabricFlavour)
@table(TableNames.LeafletFile)
@model()
export class LeafletFile extends Cacheable {
  @pk()
  @composed(["leafletId", "filename"], ":")
  @description("Unique identifier of the leaflet file.")
  id!: string;

  @required()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description("Identifier of the leaflet this file belongs to.")
  leafletId!: string;

  //@cache()
  @column()
  @required()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description("Name of the file, including its extension.")
  filename!: string;

  //@cache()
  @column()
  @required()
  @description("Base64-encoded content of the file.")
  fileContent!: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<LeafletFile>) {
    super(model);
  }
}
