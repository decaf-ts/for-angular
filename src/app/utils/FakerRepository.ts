import { Model } from '@decaf-ts/decorator-validation';
import { DecafRepository } from 'src/lib/engine/types';
import { AIModel } from '../models/AIVendorModel';
import {  AIFeatures } from './contants';
import { DecafFakerRepository } from 'src/lib/utils/DecafFakerRepository';
import { Product, ProductNames } from '../ew/models/Product';
export class FakerRepository<T extends Model> extends DecafFakerRepository<T> {

  public override async initialize(): Promise<void> {
    super.initialize();
    const repo = this._repository as DecafRepository<Model>;
    let data = await repo.select().execute();
    if(!this.data?.length) {
      const name = (this.model as Model).constructor.name;
      switch(name) {
        case AIModel.name:
          data = await this.generateData<AIModel>(AIFeatures, 'features', "name");
          break;
        case Product.name:
          data = await this.generateData<Product>(ProductNames, 'inventedName', "string");
          break;
        default:
          data = await this.generateData();
      }
      try {
         data = await this.repository?.createAll(data);
      } catch (error: unknown) {
        console.error(error);
      }
    }
    this.data = data as T[];
  }
}
