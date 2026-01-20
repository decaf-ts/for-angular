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
import { Leaflet, ProductMarket, ProductStrength } from '../fabric';
import { CrudFieldComponent, FieldsetComponent, ListComponent } from 'src/lib/components';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { DecafComponent } from '@decaf-ts/ui-decorators';

export async function renderMakets<C extends CrudFieldComponent>(instance: C): Promise<void> {
  return await new ProductEpiHandler().renderMakets(instance);
}

export function getDocumentProperties(filterBy: 'productCode' | 'batchNumber' = 'productCode') {
  return {
    showSearchbar: false,
    title: 'Documents',
    operations: [OperationKeys.READ],
    showRefresher: false,
    route: 'leaflets',
    icon: 'ti-file-barcode',
    filterBy,
    empty: {
      link: async function <T extends DecafComponent<Model>>() {
        const component = this as unknown as T;
        const param = `${component.modelId ? `?${filterBy}=${component.modelId}` : ''}`;
        await component.router.navigateByUrl(`/leaflets/create${param}`);
      },
    },
  };
}

export class ProductEpiHandler extends NgxEventHandler {
  override async render(): Promise<void> {
    const instance = this as unknown as NgxComponentDirective;
    if (instance.modelName === Leaflet.name) {
      if (instance.operation === OperationKeys.CREATE) {
        instance.searchValue = ProductEpiHandler.getSearchOptions<Leaflet>(
          'productCode',
          null,
          'Equal',
        );
      }
    }
    console.log(instance.filterBy);
    console.log(instance.modelName, this.name, this.operation);
    // const relation = component.filterBy;
    // if (component?.operation === OperationKeys.CREATE) {
    //   console.log(component.filterBy);
    // }
  }

  async renderMakets<C extends CrudFieldComponent>(component: C): Promise<void> {
    if (component?.modelId) {
      console.log(component.model);
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
      console.log(component.options);
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

  static getSearchOptions<M extends Model>(
    filter: string,
    value: string | null,
    condition: string,
  ): IFilterQuery {
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
