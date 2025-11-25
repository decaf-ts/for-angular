import { Condition } from "@decaf-ts/core";
import { Model } from "@decaf-ts/decorator-validation";
import { DecafComponent } from "@decaf-ts/ui-decorators";
import { DecafRepository } from "src/lib/engine";

export class LeafletHandler extends DecafComponent {

  override async render(): Promise<void> {
    const value = !isNaN(this.modelId as number) ? Number(this.modelId) : this.modelId
    const condition = Condition.attribute<Model>('productCode' as keyof Model).eq(value);
    if(this._repository) {
      const model = await (this._repository as DecafRepository<Model>).query(condition, 'productCode' as keyof Model);
      if(model?.length && this.model?.constructor)
        this.model = Model.build(model[0], this.model?.constructor?.name);
    }
  }
}
