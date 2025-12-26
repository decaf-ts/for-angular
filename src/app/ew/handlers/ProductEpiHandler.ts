import { Condition } from "@decaf-ts/core";
import { Metadata, Constructor } from "@decaf-ts/decoration";
import { Model, Primitives } from "@decaf-ts/decorator-validation";
import { DecafRepository, NgxEventHandler } from "src/lib/engine";

export class ProductEpiHandler extends NgxEventHandler {

  override async render(): Promise<void> {
    let relation = 'productCode';
    const repository = this._repository as DecafRepository<Model>;
    const modelName = this.model ? (this.model.constructor as Constructor<Model>).name : '';

    if(this.model && modelName.toLowerCase().includes('batch')) {
      relation = 'batchNumber';
      // const context = getModelAndRepository('Leaflet');
      // repository = context?.repository as DecafRepository<Model>;
    }
    if(repository) {
      const type = Metadata.type(repository.class, relation).name.toLowerCase();
      const value = ([Primitives.NUMBER, Primitives.BIGINT].includes(type.toLowerCase()) ? Number(this.modelId) : this.modelId) as string | number;
      const condition = Condition.attribute<Model>(relation as keyof Model).eq(value);
      const query = await repository.query(condition, relation as keyof Model);
      // const data = await repository.select().execute();
      if(query?.length) {
        // if(this.name === 'Leaflet')
        //   (this as unknown as ListComponent).data = query;
        this.value = query;
        await this.refresh(this.operation as string);
      }
    }
  }
}
