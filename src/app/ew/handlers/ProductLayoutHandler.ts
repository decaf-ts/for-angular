
import { OperationKeys } from "@decaf-ts/db-decorators";
import { Constructor, Metadata } from "@decaf-ts/decoration";
import { Model, Primitives } from "@decaf-ts/decorator-validation";
import {
  NgxEventHandler,
  ICrudFormEvent,
  KeyValue
} from "src/lib/engine";
import { getNgxToastComponent } from "src/app/utils/NgxToastComponent";
import { getModelAndRepository } from "src/lib/for-angular-common.module";


export class ProductLayoutHandler extends NgxEventHandler {

  override async handle(event: ICrudFormEvent, key: string = 'product', pk: string = 'productCode'): Promise<void> {
    const iterate = async (evt: ICrudFormEvent, model: string | Model, parent?: string) => {
      const result: boolean[] = [];
      model = model || this.model as Model;
      const constructor = Model.get(typeof model === Primitives.STRING ? (model as string) : model?.constructor.name);
      if (constructor) {
        const properties = Metadata.properties(constructor as Constructor<Model>) as string[];
        const promises = properties.map(async (prop) => {
          const type = Metadata.type(constructor as Constructor<Model>, prop).name;
          let data = (evt.data as KeyValue)[prop] || (event.data as KeyValue)[prop];

          if (data) {
            if (parent || Array.isArray(data)) {
              data = [...Object.values(data)];
              data = data.map((item: Partial<Model>) => Object.assign(item || {}, {
                [pk]: this.modelId },
                pk === 'batchNumber' ? {
                  productCode: (event?.data as KeyValue)[key]['productCode']
                } : {}));
            }
            evt = { ...evt, data };
            const context = getModelAndRepository(type as string);
            if (!context) {
              await iterate(evt, type as string, prop);
            } else {
              const { repository } = context;
              const {success} = await this.submit(evt, false, repository);
              result.push(success);
            }
          }
        });
        await Promise.all(promises);
        return result;
      }
    }

    if(!this.pk)
      this.pk = pk;

    if(this.operation === OperationKeys.CREATE)  {
      const {data} = event;
      this.modelId = (data as KeyValue)[key][pk];
    }

    const result  = await iterate(event, this.model as Model) as boolean[]
    const success = result.every((res: boolean) => res);
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
