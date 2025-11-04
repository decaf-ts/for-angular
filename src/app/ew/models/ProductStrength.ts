
import { Model, ModelArg, required } from "@decaf-ts/decorator-validation";

export class ProductStrength extends Model {
  @required()
  strength!: string;

  substance?: string;

  legalEntityName?: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<ProductStrength>) {
    super(model);
  }
}
