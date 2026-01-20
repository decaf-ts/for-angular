import {
  CrudOperations,
  IRepository,
  OperationKeys,
  PrimaryKeyType,
} from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import {
  NgxEventHandler,
  ICrudFormEvent,
  KeyValue,
  DecafRepository,
  ComponentEventNames,
  FormParent,
  IRepositoryModelProps,
} from 'src/lib/engine';
import { getNgxToastComponent } from 'src/app/utils/NgxToastComponent';
import { getNgxModalComponent } from 'src/lib/components/modal/modal.component';
import { ProductImage } from '../fabric/ProductImage';
import { Product } from '../fabric';

export class ProductHandler<M extends Model> extends NgxEventHandler {
  formGroup!: FormParent;

  // static deleteEvents: > = {};

  static data:
    | Record<string, Record<string, { repository: DecafRepository<Model>; data?: Model[] }>>
    | undefined;

  static readonly modelId: string;

  static store(operation: CrudOperations, repository: DecafRepository<Model>, model: Model): void {
    const data = ProductHandler.data || {};
    if (!(operation in data)) {
      data[operation] = {};
    }
    if (!(repository.class.name in data[operation])) {
      data[operation][repository.class.name] = { repository, data: [] };
    }
    data[operation][repository.class.name].data?.push(model);
    ProductHandler.data = data;
  }

  static getStored(operation: CrudOperations) {
    return ProductHandler.data?.[operation] || {};
  }

  static getProductImage<M extends Model>(data: M, repository: DecafRepository<M>): M {
    if (repository.class.name === Product.name) {
      const model = data as Product & M;
      if (!model.imageData) return data as M;
      model.imageData = Model.build(
        {
          productCode: model['productCode'],
          content: model['imageData'],
        },
        ProductImage.name,
      ) as ProductImage;
      return model;
    }
    return data;
  }

  static endTransaction(): void {
    ProductHandler.data = undefined;
  }

  override async handle(event: ICrudFormEvent): Promise<void> {
    const { name, role } = event;
    const allowSubmit = true;
    let success = false;
    const redirect = true;

    if (name === ComponentEventNames.FormGroupLoaded) {
      this.formGroup = event.data as FormParent;
      return;
    }

    if (role === OperationKeys.DELETE) {
      const { context, data } = event;

      // search for context, handle strengths and markets deletion
      if (!context) {
        success = (await this.submit({ ...event, data }, false)).success;
      } else {
        const { repository } = context as IRepositoryModelProps<Model>;
        ProductHandler.store(role, repository, data as M);

        // const deleteObject = ProductHandler.deleteEvents;
        // if(!ProductHandler.deleteEvents[repository.class.name]) {
        // }
        // if (!ProductHandler.deleteEvents[modelName as string] && repository) {
        //   ProductHandler.deleteEvents[modelName as string] = { repository };
        // }
        // const propData = ProductHandler.deleteEvents[modelName as string].data
        // ProductHandler.deleteEvents[modelName as string].data = [
        //     ProductHandler.deleteEvents[modelName as string]?.data || [],
        // ]
        // // ProductHandler.deleteEvents.push(event);
        // console.log(ProductHandler.deleteEvents);
        return;
      }
    }

    if (role === OperationKeys.CREATE || role === OperationKeys.UPDATE) {
      // const { context } = (await this.process(
      //   event,
      //   this.model as M,
      //   false,
      // )) as ILayoutModelContext;
      // const { data, repository } = context;
      const { epi } = event.data as KeyValue;
      const { markets, strengths } = epi;
      success = (await this.submit(event, false)).success;
      // if ('imageData' in data) {
      //   data['imageData'] = Model.build(
      //     {
      //       productCode: data['productCode'],
      //       content: data['imageData'],
      //     },
      //     ProductImage.name
      //   ) as ProductImage;
      // }
      // const result = await this.submit({...event, data: model}, true);
      // success = result.success;
    } else {
      // const models = await this.process(event, this.model as Model, false) as IRepositoryModelProps<Model>[];
      // const repo = getModelAndRepository(modelName);
      // if(repo) {
      //   const {repository, model, pk} = repo;
      //   const data = {} as KeyValue;
      //   for(const key of Object.keys(models)) {
      //     if(key === model.constructor.name.toLowerCase()) {
      //       Object.assign(data, models[key].model);
      //     } else {
      //       data[key] = models[key].model;
      //     }
      //   }
      //   if(this.operation === OperationKeys.UPDATE) {
      //     const diffs = await ProductLayoutHandler.beforeSave(
      //       repository,
      //       Model.build(data, model.constructor.name),
      //       models,
      //       pk,
      //     );
      //     if(diffs) {
      //       const locale = modelName.toLowerCase();
      //       const modal = await getNgxModalComponent({
      //         tag: 'app-modal-diffs',
      //         expandable: true,
      //         title: `${modelName.toLowerCase()}.diffs.title`,
      //         //  headerTransparent: true,
      //         globals: {
      //           diffs,
      //           locale
      //         }
      //       });
      //       await modal.present();
      //       const {role} = await modal.onDidDismiss();
      //       allowSubmit = role === ActionRoles.confirm;
      //     }
      //   }
      //   if(allowSubmit) {
      //     const data = {} as KeyValue;
      //     for(const key of Object.keys(models)) {
      //       if(key === model.constructor.name.toLowerCase()) {
      //         Object.assign(data, models[key].model);
      //       } else {
      //         const childPk = models[key].pk;
      //         data[key] = ((models[key].model || []) as KeyValue[]).map((m: KeyValue) => {
      //           if(m[childPk] === undefined || !m[childPk])
      //             delete m[childPk];
      //           return {...m, ...{[pk]: data[pk]}};
      //         });
      //       }
      //     }
      //     success = await ProductLayoutHandler.submit(
      //       repository,
      //       Model.build(data, model.constructor.name),
      //       this.operation as OperationKeys
      //     );
      //   }
      // }
    }

    if (success) {
      this.location.back();
    }
    const options = {
      color: success ? 'dark' : 'danger',
      message: await this.translate(`operations.multiple.${success ? 'success' : 'error'}`),
    };
    const toast = getNgxToastComponent(options);
    await toast.show(options);
  }

  override async beforeCreate<M extends Model>(
    data: M,
    repository: DecafRepository<M>,
  ): Promise<M> {
    return ProductHandler.getProductImage<M>(data, repository);
  }

  // static async beforeSave<M extends Model>(
  //   repository: IRepository<M>,
  //   data: M,
  //   models: IRepositoryModelProps<M>,
  //   pk: string
  // ): Promise<KeyValue | undefined> {
  //   const skip = [
  //     pk,
  //     'strengths',
  //     'markets',
  //     'id',
  //     'updatedAt',
  //     'updatedBy',
  //     'version',
  //     'createdBy',
  //     'createdAt',
  //   ] as (keyof M)[];
  //   const oldData = (await repository.read((data as KeyValue)[pk])) as M;
  //   const modelDiffs = data.compare(oldData, ...skip);
  //   const filterDiffs = {} as KeyValue;
  //   for (const [key, value] of Object.entries(modelDiffs || {})) {
  //     const { other, current } = Array.isArray(value) ? value[0] : value;
  //     if (Array.isArray(other)) {
  //       if (!other.length && current === undefined) continue;
  //     } else {
  //       if (Array.isArray(current)) {
  //         if (current.length === Number(other)) continue;
  //       }
  //     }
  //     if (Array.isArray(current) && Array.isArray(other) && other.length) {
  //       filterDiffs[key] = { other: '', current: current.slice(other.length) };
  //       continue;
  //     }
  //     filterDiffs[key] = value;
  //   }
  //   return Object.keys(filterDiffs as KeyValue).length
  //     ? filterDiffs
  //     : undefined;
  // }
  static async checkDiffs<M extends Model>(
    data: M,
    repository: IRepository<M>,
    modelId: PrimaryKeyType,
  ): Promise<any> {
    // console.log(this);
    const oldData = (await repository.read(modelId)) as M;
    console.log(repository);

    return null;
  }

  override async beforeUpdate<M extends Model>(
    data: M,
    repository: DecafRepository<M>,
    modelId: PrimaryKeyType,
  ): Promise<void> {
    data = ProductHandler.getProductImage<M>(data, repository);
    const modelName = repository.class.name;
    const diffs = await ProductHandler.checkDiffs<M>(
      Model.build(data, modelName),
      repository,
      modelId,
    );
    if (diffs) {
      const locale = modelName.toLowerCase();
      const modal = await getNgxModalComponent({
        tag: 'app-modal-diffs',
        expandable: true,
        title: `${modelName.toLowerCase()}.diffs.title`,
        //  headerTransparent: true,
        globals: {
          diffs,
          locale,
        },
      });
      await modal.present();
      const { role } = await modal.onDidDismiss();
    }
    const toDelete = ProductHandler.getStored(OperationKeys.DELETE);
    for (const [name, value] of Object.entries(toDelete)) {
      const { repository, data } = value;
      if (data?.length) {
        const pk = Model.pk(repository.class);
        const items = data.map((item) => (item as KeyValue)[pk]);
        await repository.deleteAll(items);
      }
    }

    ProductHandler.endTransaction();

    // if (ProductHandler.deleteEvents?.length) {
    //   for (const event of ProductHandler.deleteEvents) {
    //     const { context } = event;
    //     if (context) {
    //       const { repository, pk } = context;
    //       await this.submit(event as ICrudFormEvent, false, context.repository);
    //       ProductHandler.deleteEvents = [];
    //     }
    //   }
    // }
  }

  // static async submit(
  //   repository: IRepository<Model>,
  //   model: Model,
  //   operation: OperationKeys
  // ): Promise<boolean> {
  //   let success = false;
  //   try {
  //     if (model) {
  //       let result;
  //       switch (operation) {
  //         case OperationKeys.CREATE:
  //           result = await repository.create(model);
  //           break;
  //         case OperationKeys.UPDATE: {
  //           result = await repository.update(model);
  //           break;
  //         }
  //         // case OperationKeys.DELETE:
  //         // result = await (!Array.isArray(model)
  //         //   ? repository.delete(model as string | number)
  //         //   : repository.deleteAll(model as string[] | number[]));
  //         // break;
  //       }
  //       success = result ? true : false;
  //     }
  //   } catch (error: unknown) {
  //     console.error(
  //       `Error during ${operation} operation: ${
  //         error instanceof Error ? error.message : (error as string)
  //       }`
  //     );
  //   }
  //   return success;
  // }
}
