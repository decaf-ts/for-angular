
import { OperationKeys } from "@decaf-ts/db-decorators";
import { Constructor, Metadata } from "@decaf-ts/decoration";
import { Model, Primitives } from "@decaf-ts/decorator-validation";
import { getNgxToastComponent } from "src/app/utils/NgxToastComponent";
import { NgxEventHandler, ICrudFormEvent, NgxModelPageDirective, IBaseCustomEvent, KeyValue, IModelPageCustomEvent } from "src/lib/engine";
import { getModelAndRepository } from "src/lib/for-angular-common.module";
import { Product } from "../models/Product";
import { ProductLayout } from "../layouts/ProductLayout";

export class ProductLayoutHandler extends NgxEventHandler {

  override async handle(event: ICrudFormEvent): Promise<void> {

    const iterate = async (evt: ICrudFormEvent, model: string | Model, parent?: string) => {
      const result: Partial<IModelPageCustomEvent>[] = [];
      model = model || (this.model as Model);
      const constructor = Model.get(typeof model === Primitives.STRING ? (model as string) : model?.constructor.name);
      if (constructor) {
        const properties = Metadata.properties(constructor as Constructor<Model>) as string[];
        // acumula todas as promises
        const promises = properties.map(async (prop) => {
          const type = Metadata.type(constructor as Constructor<Model>, prop).name;
          let data = (evt.data as KeyValue)[prop] || (event.data as KeyValue)[prop];

          if (data) {
            if (parent) {
              data = [...Object.values(data)];
              data = data.map((item: Partial<Model>) => {
                Object.assign(item, { [this.pk]: this.modelId });
                return item;
              });
            }

            evt = { ...evt, data };
            const context = getModelAndRepository(type as string);

            if (!context) {
              // recursão
              await iterate(evt, type as string, prop);
            } else {
              const { repository } = context;
              const item = await this.submit(evt, repository);
              result.push({ success: item.success, message: item.message });
            }
          }
        });
        await Promise.all(promises);
        return result;
      }
    }

    if(!this.pk)
      this.pk = 'productCode';

    if(this.operation === OperationKeys.CREATE)  {
      const {data} = event;
      this.modelId = (data as KeyValue)['product']['productCode'];
    }
    const result = await iterate(event, this.model as Model) as Partial<IModelPageCustomEvent>[];
    const success = result.every((item: Partial<IModelPageCustomEvent>) => item.success);
    const options = {
      color: success ? 'dark' : 'danger',
      message: await this.translate(`operations.${this.operation}.${success ? 'success' : 'error'}`, {"0": this.modelId, "1": this.pk}),
    };
    const toast = getNgxToastComponent(options);
    await toast.show(options).then(() => {
      if(success)
        this.location.back();
    });
  }
}
