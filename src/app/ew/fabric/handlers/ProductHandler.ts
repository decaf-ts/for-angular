import { Condition } from '@decaf-ts/core';
import { CrudOperations, IRepository, OperationKeys, PrimaryKeyType } from '@decaf-ts/db-decorators';
import { Comparison, Model } from '@decaf-ts/decorator-validation';
import { getNgxLoadingComponent, NgxLoadingComponent } from 'src/app/utils/NgxLoadingController';
import { getNgxToastComponent } from 'src/app/utils/NgxToastComponent';
import { FileUploadComponent } from 'src/lib/components';
import { getNgxModalComponent } from 'src/lib/components/modal/modal.component';
import {
  ActionRoles,
  DecafRepository,
  FormParent,
  getModelAndRepository,
  ICrudFormEvent,
  IRepositoryModelProps,
  KeyValue,
  NgxComponentDirective,
  NgxEventHandler,
} from 'src/lib/engine';
import { NgxRouterService } from 'src/lib/services/NgxRouterService';
import { Product } from '..';
import { ProductImage } from '../ProductImage';

function calculateGtinCheckSum(digits: string): string {
  digits = '' + digits;
  if (digits.length !== 13) throw new Error('needs to received 13 digits');
  const multiplier = [3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3];
  let sum = 0;
  try {
    // multiply each digit for its multiplier according to the table
    for (let i = 0; i < 13; i++) sum += parseInt(digits.charAt(i)) * multiplier[i];

    // Find the nearest equal or higher multiple of ten
    const remainder = sum % 10;
    let nearest;
    if (remainder === 0) nearest = sum;
    else nearest = sum - remainder + 10;

    return nearest - sum + '';
  } catch (e) {
    throw new Error(`Did this received numbers? ${e}`);
  }
}

export function generateGtin(): string {
  function pad(num: number, width: number, padding: string = '0') {
    const n = num + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(padding) + n;
  }

  const beforeChecksum = pad(Math.floor(Math.random() * 9999999999999), 13); // has to be 13. the checksum is the 4th digit
  const checksum = calculateGtinCheckSum(beforeChecksum);
  return `${beforeChecksum}${checksum}`;
}

// export function getBatch() {
//   return Math.random().toString(36).replace('.', '').toUpperCase().slice(5);
// }

export class ProductHandler<M extends Model> extends NgxEventHandler {
  formGroup!: FormParent;

  routerService!: NgxRouterService;

  static pk: string;

  static loading: NgxLoadingComponent = getNgxLoadingComponent();

  static instance?: NgxComponentDirective;

  static skip = [
    // 'strengths',
    // 'markets',
    'owner',
    'id',
    'uuid',
    'updatedAt',
    'updatedBy',
    'createdBy',
    'createdAt',
  ] as string[];

  // static deleteEvents: > = {};

  static data: Record<string, Record<string, { repository: DecafRepository<Model>; data?: Model[] }>> | undefined;

  static readonly modelId: string;
  // override async render(instance: any, prop: string): Promise<string | void> {
  //   if (instance.pk) {
  //     ProductHandler.pk = instance.pk;
  //   }
  //   if (prop) {
  //     if (prop === ProductHandler.pk && instance.operation !== OperationKeys.CREATE) {
  //       instance.readonly = true;
  //       // instance.hidden = true;
  //       // instance.component.nativeElement.style.display = 'none';
  //     }
  //   }
  // }

  override async render(instance: any, prop: string, value: string): Promise<string | void> {
    if (instance.pk) {
      ProductHandler.pk = instance.pk;
    }
    if (prop) {
      if (prop === ProductHandler.pk && instance.operation !== OperationKeys.CREATE) {
        instance.readonly = true;
        // instance.hidden = true;
        // instance.component.nativeElement.style.display = 'none';
      }

      if (prop === 'imageData') {
        await ProductHandler.getProductImageData(instance as FileUploadComponent, value);
      }
    }
  }

  override async handle(event: ICrudFormEvent): Promise<void> {
    const { name, role } = event;
    const allowSubmit = true;
    let result = false;
    let submited = false;
    const redirect = true;

    // const {log, ctx} = (await repository["logCtx"]([], operation, true)).for(repository.create);
    // ctx.headers = {
    //   Authorization: 'Bearer aaaaaaaaaaaaaaaa',
    // }
    // if (name === ComponentEventNames.FormGroupLoaded) {
    //   this.formGroup = event.data as FormParent;
    //   return;
    // }

    if (role === OperationKeys.DELETE) {
      const { context, data } = event;

      // search for context, handle strengths and markets deletion
      if (!context) {
        const { success, aborted } = await this.submit({ ...event, data }, false);
        submited = !aborted;
        result = success;
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
      ProductHandler.instance = this as unknown as NgxComponentDirective;

      await ProductHandler.loading.show();
      // const { context } = (await this.process(
      //   event,
      //   this.model as M,
      //   false,
      // )) as ILayoutModelContext;
      // const { data, repository } = context;
      const { success, aborted } = await this.submit(event, false);
      submited = !aborted;
      result = success;

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
    if (submited) {
      if (result && redirect) {
        const routerService = this.injector.get(NgxRouterService);
        routerService.navigateTo(`/products`);
      }
      const options = {
        color: result ? 'dark' : 'danger',
        message: await this.translate(`operations.multiple.${result ? 'success' : 'error'}`),
      };

      const toast = getNgxToastComponent(options);
      await toast.show(options);
      if (ProductHandler.loading.isVisible()) {
        await ProductHandler.loading.remove();
      }
    }
  }

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

  static async getProductImageData(instance: FileUploadComponent, value: string) {
    const repo = getModelAndRepository('ProductImage');
    if (repo && value) {
      const { repository } = repo;
      const data = (await repository
        .select()
        .where(Condition.attr('productCode' as keyof ProductImage).eq(instance.value))
        .execute()) as ProductImage[];
      if (data?.length) {
        instance.setValue(data[0].content);
        // instance.value = JSON.parse(data[0].content[0]) as string;
      }
    }
  }

  static getProductImage(data: Partial<Product>): Product {
    const model = data as Product;
    if (!model.imageData) {
      return data as Product;
    }
    const { productCode, imageData } = model;
    model.imageData = Model.build(
      {
        productCode,
        content: imageData,
      },
      ProductImage.name
    ) as ProductImage;
    return model;
  }

  static async endTransaction<M extends Model>(
    data: M,
    repository: IRepository<M>,
    modelId: PrimaryKeyType
  ): Promise<boolean | void> {
    const modelName = repository.class.name;
    const loading = this.loading;
    const diffs = await this.getDiffs<M>(Model.build(data, modelName), repository, modelId);

    if (diffs) {
      if (loading.isVisible()) {
        await loading.remove();
      }
      const locale = modelName.toLowerCase();
      const modal = await getNgxModalComponent({
        tag: 'app-modal-diffs',
        expandable: true,
        title: `${locale}.diffs.title`,

        //  headerTransparent: true,
        globals: {
          diffs,
          locale,
        },
      });
      await modal.present();
      const { role } = await modal.onDidDismiss();
      if (role === ActionRoles.cancel) {
        return false;
      }
      await loading.show();
    }
    // TODO: check if necessary
    // const toDelete = ProductHandler.getStored(OperationKeys.DELETE);
    // for (const [name, value] of Object.entries(toDelete)) {
    //   const { repository, data } = value;
    //   if (data?.length) {
    //     const pk = Model.pk(repository.class);
    //     const items = data.map((item) => (item as KeyValue)[pk]);
    //     await repository.deleteAll(items);
    //   }
    // }
    ProductHandler.data = undefined;
  }

  override async beforeCreate(data: Product, repository: DecafRepository<Product>): Promise<Product> {
    return ProductHandler.getProductImage(data);
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

  static async getDiffs<M extends Model>(data: M, repository: IRepository<M>, modelId: PrimaryKeyType): Promise<any> {
    // console.log(this);
    const result = {} as KeyValue;
    const oldData = (await repository.read(modelId)) as M;
    const modelDiffs = data.compare(
      oldData,
      ...([Model.pk(repository.class) as keyof M, ProductHandler.skip] as (keyof M)[])
    ) as KeyValue;

    ProductHandler.skip.forEach((prop) => delete modelDiffs?.[prop]);

    function filterSkippedProps(item: Comparison<M>) {
      return Object.entries(item).reduce(
        (acc, [k, v]) => {
          if (!ProductHandler.skip.includes(k as string)) {
            acc[k] = v;
          }
          return acc;
        },
        {} as Record<string, unknown>
      );
    }

    function getDiff(data: Record<keyof M, { current: unknown; other: unknown }>):
      | {
          other: Record<string, unknown>;
          current: Record<string, unknown>;
        }
      | undefined {
      const diff = { other: {}, current: {} };
      for (const key in data) {
        if (ProductHandler.skip.includes(key)) continue;
        if (key in data) {
          const item = data[key];
          if (item.other !== undefined) {
            (diff.other as Record<string, unknown>)[key] = filterSkippedProps(item.other as Comparison<M>);
          }
          if (item.current !== undefined) {
            (diff.current as Record<string, unknown>)[key] = filterSkippedProps(item.current as Comparison<M>);
          }
        }
      }
      const { other, current } = diff;
      if (!Object.keys(other).length && !Object.keys(current).length) {
        return undefined;
      }
      return diff;
    }

    // console.log(modelDiffs);
    for (const [key, value] of Object.entries(modelDiffs || {})) {
      if (Array.isArray(value)) {
        if (value.length) {
          value.map((d, index) => {
            const diffs = getDiff(d);
            if (diffs) {
              result[`${key}_${index + 1}`] = diffs;
            }
          });
        }
        continue;
      }
      const diff = value;
      let other = diff?.other || diff?.old || undefined;
      let current = diff?.current || diff?.new || undefined;
      if (Array.isArray(other)) {
        other = other.map((item) => filterSkippedProps(item as Comparison<M>));
      }
      if (Array.isArray(current)) {
        current = current.map((item) => filterSkippedProps(item as Comparison<M>));
      }
      //   if (!other.length && current === undefined) continue;
      // } else {
      //   if (Array.isArray(current)) {
      //     if (current.length === Number(other)) continue;
      //   }
      // }
      // if (Array.isArray(current) && Array.isArray(other) && other.length) {
      //   result[key] = { other: '', current: current.slice(other.length) };
      //   continue;
      // }
      if (current !== undefined && current !== other) {
        result[key] = { other, current };
      }
    }
    console.log(result);
    // console.log(result);
    return Object.keys(result as KeyValue).length ? result : undefined;
  }

  override async beforeUpdate<M extends Model>(
    data: M,
    repository: DecafRepository<M>,
    modelId: PrimaryKeyType
  ): Promise<void | boolean> {
    return ProductHandler.endTransaction(ProductHandler.getProductImage(data as Partial<Product>), repository, modelId);

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
