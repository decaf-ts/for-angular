import { TableComponent } from 'src/lib/components/table/table.component';
import { Batch } from '../Batch';
import { ProductHandler } from './ProductHandler';
import { getModelAndRepository } from 'src/lib/engine/helpers';
import { Product } from '../Product';

export class BatchHandler extends ProductHandler<Batch> {
  override async render(instance: TableComponent, prop: string): Promise<string | void> {
    if (prop) {
      return await BatchHandler.getValueOnProductData(instance, prop as keyof Product);
    } else {
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
    }
  }

  private static async getValueOnProductData(instance: TableComponent, prop: keyof Product) {
    if (instance?._query) {
      const product = (instance._query as Product[]).find(
        (item) => item['productCode'] === (instance.model as Batch).productCode,
      ) as Product | undefined;
      if (product?.[prop]) {
        return product[prop as keyof typeof product] as string;
      }
    }
    return '';
  }

  async nameMedicinalProduct(instance: TableComponent): Promise<string> {
    alert('aaaaaaaaaaaaaa');
    return 'nameMedicinalProduct';
  }
}
