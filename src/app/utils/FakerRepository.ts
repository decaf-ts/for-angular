import { Model } from '@decaf-ts/decorator-validation';
import { DecafRepository } from 'src/lib/engine/types';
import { AIModel } from '../models/AIVendorModel';
import { AIFeatures } from './contants';
import { DecafFakerRepository } from 'src/lib/utils/DecafFakerRepository';
import { Product, ProductNames } from '../ew/models/Product';
import { ProductStrength } from '../ew/models/ProductStrength';
import { Batch } from '../ew/models/Batch';
import { faker } from '@faker-js/faker';
import { Leaflet } from '../ew/models/Leaflet';
export class FakerRepository<T extends Model> extends DecafFakerRepository<T> {


  public override async initialize(): Promise<void> {
    await super.initialize();
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
          data = data.map((item: Partial<Product>) => {
            delete item.productImage;
            return item as T;
          })
          break;
        case Batch.name:
          this.limit = 40;
          data = await this.generateData<Batch>();
          data = [... data.map((item: Partial<Batch>) => {
            const productCode = `0${Math.floor(Math.random() * 5) + 1}`;
            item.productCode = productCode;
            item.batchNumber = `batch${productCode}_${faker.lorem.word(24)}`.trim();
            item.expiryDate = '251200';
            item.enableDaySelection = true;
            return item as T;
          })]
          break;
        case Leaflet.name: {
          this.limit = 10;
          this.propFnMapper = {
            lang: () => {
              const languages = ['en', 'fr', 'de', 'it', 'es', 'pt', 'pt-br'] as string[];
              return languages[Math.floor(Math.random() * languages.length)]
            },
            // id: () => {
            //   const languages = ['en', 'fr', 'de', 'it', 'es', 'pt', 'pt-br'] as string[];
            //   const lang = languages[Math.floor(Math.random() * languages.length)]
            //   const productCode = `0${Math.floor(Math.random() * 5) + 1}`;
            //   return `${productCode}:${lang}:${Math.floor(Math.random() * 10000) + 1}`;
            // },
            type: () => {
              const types = ['prescribingInfo', 'leaflet'];
              return types[Math.floor(Math.random() * types.length)];
            },
            productCode: () => {
              return `0${Math.floor(Math.random() * 5) + 1}`;
            }
          };
          data = await this.generateData<Leaflet>();
          break;
        }
        case ProductStrength.name: {
          data = await this.generateData<ProductStrength>();
          data = data.map((item: Partial<ProductStrength>) => {
            item.productCode = `${Math.floor(Math.random() * 5) + 1}`;
            return item as T;
          }) as T[];
          break;
        }
        default:
          data = await this.generateData();
      }
      try {
        //   data = await Promise.all(data.map(async (item: Partial<Model>) => {
        //   const pk = item[this.pk as keyof Model];
        //   const check = await this.repository.read([Primitives.NUMBER, Primitives.BIGINT].includes(this.pkType as Primitives) ? Number(pk) : String(pk));
        //   if (!check)
        //     return await this.repository.create(item as Model);
        //   return check;
        // })) as T[];
        data = await this.repository?.createAll(data);
      } catch (error: unknown) {
        this.log.for(this.initialize).error(`Error on populate ${this.model?.constructor.name}: ${(error as Error)?.message || error  as string}`);
      }
    }
    this.data = data as T[];
  }
}
