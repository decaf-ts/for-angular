import { Condition, OrderDirection } from '@decaf-ts/core';
import { Metadata, Constructor } from '@decaf-ts/decoration';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import {
  DecafRepository,
  getModelAndRepository,
  IFilterQuery,
  NgxComponentDirective,
  NgxEventHandler,
  SelectOption,
} from 'src/lib/engine';
import { Batch, Leaflet, Product, ProductMarket, ProductStrength } from '..';
import { CrudFieldComponent, FieldsetComponent, ListComponent } from 'src/lib/components';
import { OperationKeys, readonly } from '@decaf-ts/db-decorators';
import { DecafComponent } from '@decaf-ts/ui-decorators';
import { el } from '@faker-js/faker/.';

export async function renderMakets<C extends CrudFieldComponent>(instance: C): Promise<void> {
  return await new EpiHandler().renderMakets(instance);
}

export function getDocumentProperties(filterBy: 'productCode' | 'batchNumber' = 'productCode') {
  return {
    showSearchbar: false,
    title: 'Documents',
    operation: OperationKeys.READ,
    operations: [OperationKeys.READ],
    showRefresher: false,
    readonly: true,
    route: 'leaflets',
    icon: 'ti-file-barcode',
    filterBy,
    // empty: {
    //   link: async function <T extends DecafComponent<Model>>() {
    //     const component = this as unknown as T;
    //     const operation = component.operation as OperationKeys;
    //     const param = `${component.modelId ? `?${filterBy}=${component.modelId}` : ''}`;
    //     alert(param);
    //     await component.router.navigateByUrl(
    //       !param ? `/leaflets` : `/leaflets/${operation}${param}`,
    //     );
    //   },
    // },
  };
}

export class EpiHandler extends NgxEventHandler {
  override async render(instance: NgxComponentDirective, prop: string = ''): Promise<void> {
    const [modelName, operation] = (instance.route || '').split('/');
    instance.filterBy = 'productCode';
    if (['products', 'batches'].includes(modelName)) {
      if (operation === OperationKeys.CREATE) {
        instance.searchValue = EpiHandler.getSearchOptions(Model.pk(Leaflet), null, 'Equal');
      } else if (operation && operation !== OperationKeys.CREATE) {
      }
    } else {
      // if (instance.modelName === Leaflet.name) {
      //   if (!(instance._query as [])?.length) {
      //     const context = getModelAndRepository(
      //       modelName === 'products' ? Product.name : Batch.name,
      //     );
      //     if (context) {
      //       const { repository } = context;
      //       const query = await repository.select().execute();
      //       if (query.length) {
      //         instance._query = query;
      //       }
      //     }
      //   }
      //   if (instance.operation === OperationKeys.CREATE) {
      //     instance.searchValue = EpiHandler.getSearchOptions('productCode', null, 'Equal');
      //   }
      // }
    }
  }

  async renderMakets<C extends CrudFieldComponent>(component: C): Promise<void> {
    if (component?.modelId) {
      const query = await this.query<ProductMarket>(
        ProductMarket.name,
        'productCode',
        component.modelId as Primitives,
      );
      if (query?.length) {
        const filterMarkets = query.map((item) => item.marketId);
        component.options = (component.options as SelectOption[])?.filter((option) => {
          if (!filterMarkets.includes(option.value as string)) {
            return option;
          }
        });
      }
    }
  }

  async query<M extends Model>(
    modelName: string,
    relation: string,
    modelId: Primitives,
  ): Promise<M[]> {
    const repo = getModelAndRepository(modelName);
    if (repo) {
      const { repository } = repo;
      return await (repository as DecafRepository<M>).query(
        Condition.attribute<M>(relation as keyof M).eq(modelId),
        relation as keyof M,
      );
    }
    return [];
  }

  static getSearchOptions(filter: string, value: string | null, condition: string): IFilterQuery {
    return {
      query: [
        {
          index: filter as string,
          condition,
          value,
        },
      ],
      sort: {
        value: filter,
        direction: OrderDirection.ASC,
      },
    };
  }
}
