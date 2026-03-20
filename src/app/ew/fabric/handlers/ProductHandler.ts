import { Condition } from '@decaf-ts/core';
import { IRepository, OperationKeys, PrimaryKeyType } from '@decaf-ts/db-decorators';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { getNgxLoadingComponent, NgxLoadingComponent } from 'src/app/utils/NgxLoadingController';
import { getNgxToastComponent } from 'src/app/utils/NgxToastComponent';
import { CrudFieldComponent, FileUploadComponent } from 'src/lib/components';
import { getNgxModalComponent } from 'src/lib/components/modal/modal.component';
import {
  ActionRoles,
  DecafRepository,
  FormParent,
  getModelAndRepository,
  ICrudFormEvent,
  KeyValue,
  NgxComponentDirective,
  NgxEventHandler,
} from 'src/lib/engine';
import { SelectOption } from 'src/lib/engine/types';
import { NgxRouterService } from 'src/lib/services/NgxRouterService';
import { Product, ProductMarket } from '..';
import { ProductLayout } from '../../layouts/ProductLayout';
import { toDiffs } from '../helpers/comparison';
import { ProductImage } from '../ProductImage';

interface IComparisonLike<T> {
  other: keyof T | undefined;
  current: keyof T | undefined;
}

type ParsedDiff<M> = Record<string, IComparisonLike<M>>;

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

  static skip = ['owner', 'id', 'uuid', 'updatedAt', 'updatedBy', 'createdBy', 'createdAt'] as string[];

  static data: Record<string, Record<string, { repository: DecafRepository<Model>; data?: Model[] }>> | undefined;

  static model: Model;

  static readonly modelId: string;

  static loadingMessage: string = 'operations.processing';
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

  override async render(instance: NgxComponentDirective, prop: string, value: string): Promise<string | void> {
    ProductHandler.instance = instance;
    if (instance?.pk || !ProductHandler.pk) {
      ProductHandler.pk = instance.pk;
    }
    if (prop) {
      if (prop === ProductHandler.pk && instance.operation !== OperationKeys.CREATE) {
        instance.readonly = true;
        // instance.hidden = true;
        // instance.component.nativeElement.style.display = 'none';
      }
      if (prop === 'productMarkets') {
        await ProductHandler.getMarketOptions(instance as CrudFieldComponent, value);
      }

      if (prop === 'imageData') {
        let isContentArray = false;
        try {
          const content = JSON.parse(value);
          if (Array.isArray(content)) {
            isContentArray = true;
          }
        } catch (e) {
          // not a json, check if it's a base64 string
        }
        if (!isContentArray) {
          await ProductHandler.getImageData(instance as FileUploadComponent, value);
        }
      }
    }
  }

  override async handle(event: ICrudFormEvent, data: ProductLayout): Promise<void> {
    const { role } = event;
    let result = false;
    let submited = false;
    ProductHandler.loadingMessage = await this.translate(ProductHandler.loadingMessage, { '0': '' });
    switch (role) {
      case OperationKeys.CREATE:
      case OperationKeys.UPDATE: {
        ProductHandler.instance = this as unknown as NgxComponentDirective;
        await ProductHandler.showLoading();
        // if ('batch' in (event.data as KeyValue)) {
        //   const batch = event.data as Batch;
        //   // const {manufacturerAddress} = batch || {};
        //   // if(Object.values(manufacturerAddress as any)?.length) {

        //   // }
        // }
        const { success, aborted } = await this.submit(event, false);
        submited = !aborted;
        result = success;
        break;
      }
      case OperationKeys.DELETE: {
        const { context, data } = event;
        if (!context) {
          const { success, aborted } = await this.submit({ ...event, data }, false);
          submited = !aborted;
          result = success;
        } else {
          // const { repository } = context as IRepositoryModelProps<Model>;
          // ProductHandler.store(role, repository, data as M);
          // return;
        }
      }
    }

    if (submited) {
      const awaitFor = 200;
      if (result) {
        // delete nested data stored
        // TODO: check if necessary
        // const toDelete = ProductHandler.getStored(OperationKeys.DELETE);
        // for (const [name, value] of Object.entries(toDelete)) {
        //   const { repository, data } = value;
        //   if (data?.length) {
        //     awaitFor = data?.length * 50;
        //     const pk = Model.pk(repository.class);
        //     const items = data.map((item) => (item as KeyValue)[pk]);
        //     await repository.deleteAll(items);
        //   }
        // }
        // const redirectSubscriber = timer(awaitFor).subscribe(async () => {
        //   await this.injector.get(NgxRouterService).navigateTo(`/products`);
        //   redirectSubscriber.unsubscribe();
        // });
        await ProductHandler.instance?.router.navigateByUrl(`products`, {
          replaceUrl: true,
          onSameUrlNavigation: 'reload',
        });
      }
      const toast = getNgxToastComponent();
      await toast.show({
        color: result ? 'dark' : 'danger',
        message: await this.translate(`operations.multiple.${result ? 'success' : 'error'}`),
      });
      if (ProductHandler.loading.isVisible()) {
        await ProductHandler.loading.remove();
      }
      ProductHandler.data = undefined;
    }
  }

  override async beforeCreate(data: Product, repository: DecafRepository<Product>): Promise<Product> {
    return await ProductHandler.buildModel(data);
  }

  override async beforeUpdate<M extends Model>(
    data: M,
    repository: DecafRepository<M>,
    modelId: PrimaryKeyType
  ): Promise<M | boolean> {
    return ProductHandler.showModalDiffs(
      await ProductHandler.buildModel(data as Partial<Product>),
      repository,
      modelId
    );
  }

  // static store(operation: CrudOperations, repository: DecafRepository<Model>, model: Model): void {
  //   const data = ProductHandler.data || {};
  //   if (!(operation in data)) {
  //     data[operation] = {};
  //   }
  //   if (!(repository.class.name in data[operation])) {
  //     data[operation][repository.class.name] = { repository, data: [] };
  //   }
  //   data[operation][repository.class.name].data?.push(model);
  //   ProductHandler.data = data;
  // }

  // static getStored(operation: CrudOperations) {
  //   return ProductHandler.data?.[operation] || {};
  // }
  static async showLoading(): Promise<void> {
    await ProductHandler.loading.show(ProductHandler.loadingMessage);
  }
  static async getImageData(instance: FileUploadComponent, value: string) {
    if ([OperationKeys.READ, OperationKeys.DELETE].includes(instance.operation)) {
      instance.label = 'product.imageData.label';
    }
    const repo = getModelAndRepository('ProductImage');
    if (repo && value) {
      const { repository } = repo;
      const image = (await repository.read(value)) as ProductImage;

      if (image) {
        instance.files = [];
        instance.setValue(image.content || '');
        instance.parseValue();
      }
    }
  }

  static async getMarketOptions(instance: CrudFieldComponent, value: string) {
    if (instance?.modelId) {
      const query = await this.queryModelData<ProductMarket>(
        instance.name,
        'productCode',
        instance.modelId as Primitives
      );
      if (query?.length) {
        const filterMarkets = query.map((item) => item.marketId);
        instance.options = (instance.options as SelectOption[])?.filter((option) => {
          if (!filterMarkets.includes(option.value as string)) {
            return option;
          }
        });
      }
    }
  }

  static async buildModel(data: Partial<Product>): Promise<Product> {
    const model = data as Product;
    const { productCode, imageData } = model;
    model.imageData = Model.build(
      {
        productCode,
        content: imageData ?? ' ',
        // updatedAt: now,
        // createdAt: now,
        // owner: owner,
      },
      ProductImage.name
    ) as ProductImage;
    model.markets = model.markets ?? [];
    model.strengths = model.strengths ?? [];
    return model;
  }

  static async showModalDiffs<M extends Model>(
    data: M,
    repository: IRepository<M>,
    modelId: PrimaryKeyType
  ): Promise<boolean | M> {
    const modelName = repository.class.name;
    const loading = this.loading;
    ProductHandler.skip = [ProductHandler.pk, ...ProductHandler.skip] as string[];
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
        className: 'dcf-modal-diffs',

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
      await this.showLoading();
    }
    return data;
  }

  static async getDiffs<M extends Model>(
    data: M,
    repository: IRepository<M>,
    modelId: PrimaryKeyType
  ): Promise<ParsedDiff<M> | undefined> {
    const model = Model.build(Object.assign({}, data), repository.class.name) as M;
    const result: ParsedDiff<M> = {};
    const oldData = (await repository.read(modelId)) as M;
    const modelDiffs = toDiffs(model.compare(oldData, ...(this.skip as (keyof M)[]))) as KeyValue;

    this.skip.forEach((prop) => {
      if (prop in modelDiffs) {
        delete modelDiffs[prop];
      }
    });

    // filter skipped props on nested props
    const filterSkippedProps = (item: keyof M) => {
      if (!item || typeof item !== 'object') {
        return item;
      }
      return Object.entries(item).reduce(
        (acc, [k, v]) => {
          if (k === 'version' && !v) {
            v = '1';
          }
          if (!this.skip.includes(k as string) && v !== undefined) {
            acc[k] = v;
          }
          return acc;
        },
        {} as Record<string, unknown>
      );
    };

    const parseArrayDiff = (data: Record<keyof M, IComparisonLike<M>>): IComparisonLike<M> | undefined => {
      const diff = { other: {} as Record<keyof M, unknown>, current: {} as Record<keyof M, unknown> };
      for (const key in data) {
        if (this.skip.includes(key)) continue;
        if (key in data) {
          const item = data[key];
          if (item.other !== undefined) {
            diff.other[key] = filterSkippedProps(item.other);
          }
          if (item.current !== undefined) {
            diff.current[key] = filterSkippedProps(item.current);
          }
        }
      }
      const { other, current } = diff;
      if (!Object.keys(other).length && !Object.keys(current).length) {
        return undefined;
      }
      return diff as IComparisonLike<M>;
    };

    // console.log(modelDiffs);
    for (const [key, value] of Object.entries(modelDiffs || {})) {
      if (Array.isArray(value)) {
        if (value.length) {
          value.map((item, index) => {
            const diffs = parseArrayDiff(item);
            if (diffs) {
              result[key] = diffs;
              // result[`${key}_${index + 1}`] = diffs;
            }
          });
        }
        continue;
      }
      const diff = value;
      let other = diff?.other || diff?.old || undefined;
      let current = diff?.current || diff?.new || undefined;
      // show diffs in single cards
      // if (Array.isArray(other) && Array.isArray(current)) {
      //   // removed
      //   if (other.length > current.length) {
      //     const pk = Model.pk(other[0]);
      //     const removedItems = current.map((item) => item[pk as string]);
      //     current = current.filter((item) => !removedItems.includes(Model.pk(item)));
      //     other = other.map((item, index) => {
      //       if (!removedItems.includes(item[pk as string])) {
      //         const diffs = filterSkippedProps(item);
      //         const diffKey = `${key}_${String(index + 1)}`;
      //         if (!result[diffKey]) {
      //           current = current.filter((curr: KeyValue) => curr[pk as string] === item[pk as string]);
      //           result[diffKey] = { other, current };
      //         }
      //         if (diffs) {
      //           result[diffKey].other = diffs as keyof M;
      //         }
      //       }
      //     });

      //     continue;
      //   } else {
      //     if (current.length > 0) {
      //       const pk = Model.pk(current[0]);
      //       const oldItems = other.map((item) => item[pk as string]);
      //       current = current.map((item, index) => {
      //         if (!oldItems.includes(item[pk as string])) {
      //           const diffs = filterSkippedProps(item);
      //           const resultKey = `${key}_${String(index + 1)}`;
      //           if (!result[resultKey]) {
      //             other = undefined;
      //             result[resultKey] = { other, current };
      //           }
      //           if (diffs) {
      //             result[resultKey].current = diffs as keyof M;
      //           }
      //         }
      //       });
      //     }
      //     continue;
      //   }
      // }
      if (Array.isArray(other)) {
        other = other.map((item) => filterSkippedProps(item));
        // parse diffs to card
        // other = other.map((item, index) => {
        //   const diffs = filterSkippedProps(item);
        //   const diffKey = `${key}_${String(index + 1)}`;
        //   if (!result[diffKey]) {
        //     result[diffKey] = { other, current };
        //   }
        //   if (diffs) {
        //     result[diffKey].other = diffs as keyof M;
        //   }
        // });
        // continue;
      }
      if (Array.isArray(current)) {
        // parse diffs to card
        current = current.map((item) => filterSkippedProps(item));
        // current = current.map((item, index) => {
        //   const diffs = filterSkippedProps(item);
        //   const resultKey = `${key}_${String(index + 1)}`;
        //   if (!result[resultKey]) {
        //     result[resultKey] = { other, current };
        //   }
        //   if (diffs) {
        //     result[resultKey].current = diffs as keyof M;
        //   }
        // });
        // continue;
      }
      if (current !== undefined && current !== other) {
        result[key] = { other, current };
      }
    }
    return Object.keys(result)?.length ? result : undefined;
  }

  static async queryModelData<M extends Model>(
    modelName: string,
    relation?: string,
    modelId?: Primitives
  ): Promise<M[]> {
    const repo = getModelAndRepository(modelName);
    if (repo) {
      const { repository } = repo;
      if (!relation || !modelId) {
        return (await repository.select().execute()) as M[];
      }
      return await (repository as DecafRepository<M>).query(
        Condition.attribute<M>(relation as keyof M).eq(modelId),
        relation as keyof M
      );
    }
    return [];
  }
}
