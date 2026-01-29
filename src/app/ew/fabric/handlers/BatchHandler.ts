import { TableComponent } from 'src/lib/components/table/table.component';
import { Batch } from '../Batch';
import { ProductHandler } from './ProductHandler';
import { getModelAndRepository } from 'src/lib/engine/helpers';
import { Product } from '../Product';
import { DecafRepository, KeyValue } from 'src/lib/engine/types';
import { formatDate, Model } from '@decaf-ts/decorator-validation';
import { BatchForm } from '../forms/BatchForm';

export class BatchHandler extends ProductHandler<Model> {
  static parseExpiryDate<M extends Model>(model: M): M {
    const { expiryDate, enableDaySelection } = model as M & BatchForm;
    const date = formatDate(new Date(expiryDate), 'yyyy-MM-dd');
    const data = Object.assign({}, model) as KeyValue;
    delete data['expiryDate'];
    delete data['enableDaySelection'];

    const result = Model.fromObject(data as M, {
      expiryDate: new Date(`${date}T${enableDaySelection ? '23:59:59' : '00:00:00'}`),
    });
    return result as M;
  }

  override async render(instance: TableComponent, prop: string): Promise<string | void> {
    if (!(instance._query as [])?.length) {
      const context = getModelAndRepository(Product.name);
      if (context) {
        const { repository } = context;
        const query = await repository.select().execute();
        if (query.length) {
          instance._query = query;
        }
      }
    }
    if (!instance.model) {
    }
    if (prop) {
      return await BatchHandler.getValueOnProductData(instance, prop as keyof Product);
    }
  }
  async afterRead<M extends Model>(model: M): Promise<M> {
    return BatchHandler.parseExpiryDate(model);
  }

  override async beforeCreate<M extends Model>(model: M): Promise<M> {
    return BatchHandler.parseExpiryDate(model);
  }

  private static async getValueOnProductData(instance: TableComponent, prop: keyof Product) {
    const query = instance._query as Product[];
    if (query && instance.model) {
      const product = query.find(
        (p) => p?.productCode === (instance.model as Batch).productCode,
      ) as Product;
      if (product && product?.[prop]) {
        return product[prop as keyof typeof product] as string;
      }
    }
    return '';
  }
}
