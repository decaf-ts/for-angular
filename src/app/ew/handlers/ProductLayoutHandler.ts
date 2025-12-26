
import { IRepository, OperationKeys } from "@decaf-ts/db-decorators";
import { Model } from "@decaf-ts/decorator-validation";
import {
  NgxEventHandler,
  ICrudFormEvent,
  KeyValue,
  NgxComponentDirective,
  DecafRepository,
  ActionRoles,
  FormParent,
  ComponentEventNames
} from "src/lib/engine";
import { getNgxToastComponent } from "src/app/utils/NgxToastComponent";
import { getNgxModalComponent } from "src/lib/components";

type LayoutModelContext = Record<string, {model: Model | Model[], repository: IRepository<Model>, pk: string}>;
export class ProductLayoutHandler extends NgxEventHandler {

  formGroup!: FormParent;

  override async handle(event: ICrudFormEvent): Promise<void> {
    const {name, data} = event;
    if(name === ComponentEventNames.FORM_GROUP_LOADED) {
      this.formGroup = data as FormParent;
      return;
    }

    const model = this.model as Model | KeyValue;
    const models = await this.process(event, model, false) as LayoutModelContext;
    let allowSubmit = true;

    //  await ProductLayoutHandler.save(this as unknown as C,  models);
    if(this.operation === OperationKeys.UPDATE) {
      const diffs = await ProductLayoutHandler.beforeSave(model, this.locale as string, models);
      if(diffs) {
        const locale = (this.locale as string).replace(/layout./g, '');
        const modal = await getNgxModalComponent({
          tag: 'app-modal-diffs',
          expandable: true,
          title: `${locale}.diffs.title`,
          //  headerTransparent: true,
          globals: {
              diffs,
              locale
          }
        });
        await modal.present();
        const {role} = await modal.onDidDismiss();
        allowSubmit = role === ActionRoles.confirm;
      }
    }

    if(allowSubmit) {
      const {success, message}  = await this.batchOperation(models, false);
      const options = {
        color: success ? 'dark' : 'danger',
        message
      };
      const toast = getNgxToastComponent(options);
      await toast.show(options).then(() => {
        if(success)
          this.location.back();
      });
    }
  }

  static async beforeSave(pageModel: KeyValue, locale: string, models: LayoutModelContext): Promise<KeyValue | undefined> {

    function findModelProp(propName: string, model = pageModel): KeyValue | KeyValue[] | undefined {
      if(typeof model === 'object') {
        if (propName in model)
          return model[propName];
        for (const key of Object.keys(model)) {
          const value = model[key];
          if (typeof value === 'object') {
            const result = findModelProp(propName, value);
            if (result !== undefined)
              return result;
          }
        }
      }
      return undefined;
    }

    const diffs = Object.keys(models).reduce((acc, name) => {
      const { model, pk } = models[name];
      if (!Array.isArray(model)) {
        const data = Model.build(findModelProp(name), model.constructor.name) as Model;
        const diffs = (model as Model).compare(
          data as Model,
          model as unknown as keyof Model
        ) as KeyValue;
        if (diffs && diffs?.[pk])
          delete diffs[pk];
        if(diffs && Object.keys(diffs).length)
          return {...acc, ...diffs};
        return acc;
      }
      const data = findModelProp(name) as KeyValue[] || "";
      if(data?.length !== model.length) {
        return {...acc, [name]: {
          other: data,
          current: [...data, ...model.map((item) => {
            return Object.entries(item).reduce((acc, [key, value]) => {
              if(value !== undefined)
                return {... acc, [key]: value}
              return acc;
            }, {})
          })].flat(),
        }};
      }
      return acc;
    }, {} as KeyValue);

    return Object.keys(diffs).length ? diffs : undefined;
  }


  static async save<C extends NgxComponentDirective>(instance: C, models: LayoutModelContext = {}): Promise<void> {
    const result: boolean[] = [];
    const promises = Object.keys(models).map(async (m) => {
       const {model, repository} = models[m];
       const {success} = await instance.submit({data: model}, false, repository as DecafRepository<Model>);
       result.push(success);
    })
    await Promise.all(promises);


    const success = result.every((res: boolean) => res);
    const options = {
      color: success ? 'dark' : 'danger',
      message: await instance.translate(
        `operations.${instance.operation}.${success ? 'success' : 'error'}`,
        {"0": instance.modelId || "", "1": instance.pk || ""}
      ),
    };
    const toast = getNgxToastComponent(options);
    await toast.show(options).then(() => {
      if(success)
        instance.location.back();
    });
    // const iterate = async (evt: ICrudFormEvent, model: string | Model, parent?: string) => {
    //   const result: boolean[] = [];
    //   model = model || this.model as Model;
    //   const constructor = Model.get(typeof model === Primitives.STRING ? (model as string) : model?.constructor.name);
    //   if (constructor) {
    //     const properties = Metadata.properties(constructor as Constructor<Model>) as string[];
    //     const promises = properties.map(async (prop) => {
    //       const type = Metadata.type(constructor as Constructor<Model>, prop).name;
    //       let data = (evt.data as KeyValue)[prop] || (parent ? (event.data as KeyValue)[parent as string][prop] : (event.data as KeyValue)[prop])

    //       if (data) {
    //         if (parent || Array.isArray(data)) {
    //           data = [...Object.values(data)];
    //           // data = data.map((item: Partial<Model>) => Object.assign(item || {}, {
    //           //   [pk]: this.modelId },
    //           //   pk === 'batchNumber' ? {
    //           //     productCode: (event?.data as KeyValue)[key]['productCode']
    //           //   } : {}));
    //         }
    //         const context = getModelAndRepository(type as string);
    //         evt = { ...evt,  data };
    //         if (!context) {
    //           await iterate(evt, type as string, prop);
    //         } else {
    //           const { repository } = context;
    //           const {success} = await super.submit(evt, false, repository);
    //           delete (evt.data as KeyValue)?.[prop];
    //           evt = { ...evt,  data: evt.data };
    //           result.push(success);
    //         }
    //       }
    //     });
    //     await Promise.all(promises);
    //     return result;
    //   }
    // }

    // if(!this.pk)
    //   this.pk = pk;

    // if(this.operation === OperationKeys.CREATE)  {
    //   const {data} = event;
    //   this.modelId = (data as KeyValue)[key][pk];
    // }

    // const result  = await iterate(event, this.model as Model) as boolean[]
    // const success = result.every((res: boolean) => res);
    // const options = {
    //   color: success ? 'dark' : 'danger',
    //   message: await this.translate(`operations.${this.operation}.${success ? 'success' : 'error'}`, {"0": this.modelId, "1": this.pk}),
    // };
    // const toast = getNgxToastComponent(options);
    // await toast.show(options).then(() => {
    //   if(success)
    //     this.location.back();
    // });
  }
}
