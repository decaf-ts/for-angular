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
import { getModelAndRepository } from 'src/lib/for-angular-common.module';
import { Audit, AuditOperations, UserGroup } from '../ew/models/Audit';
export class FakerRepository<T extends Model> extends DecafFakerRepository<T> {


  public override async initialize(): Promise<void> {
    await super.initialize();
    const repo = this._repository as DecafRepository<Model>;
    const model = this.model as Model;
    let data = await repo.select().execute();
    if(!this.data?.length) {
      const name = model.constructor.name;
      switch(name) {
        case AIModel.name:
          data = await this.generateData<AIModel>(AIFeatures, 'features', "name");
          break;
        case Product.name: {
          data = (await this.generateData<Product>(ProductNames, 'inventedName', "string"))
          .map((item: Partial<Product>, index: number) => {
            const productCode = `0${index + 1}`;
            item.productCode = productCode.padStart(14, '0');
            delete item.productImage;
            return item as T;
          })
         break;
        }
        case Batch.name: {
          const repo = getModelAndRepository('Product');
          this.limit = 40;
          data = [
              ...await Promise.all((await this.generateData<Batch>()).map(async(item: Partial<Batch>) => {
              const productCode = `0${Math.floor(Math.random() * 5) + 1}`.padStart(14, '0');
              item.productCode = productCode;
              item.batchNumber = `batch${productCode}_${item.nameMedicinalProduct}`.trim();
              item.expiryDate = '251200';
              item.enableDaySelection = true;
              if(repo) {
                const {repository} = repo;
                item.inventedName = (await repository.read(productCode) as Product)?.inventedName || item.inventedName;
              }
              return item as T;
            }))
          ]
          break;
        }
        case Audit.name: {
          data = (await this.generateData<Audit>() || []).map((item :Audit) => {
            const user = faker.internet.email().toLowerCase();
            //    const randomGroupKey = pickRandomValue(Object.keys(UserGroup));
            // item.userGroup = UserGroup[randomGroupKey as keyof typeof UserGroup];
            item.userId = user;
            item.userDID = `${user}:${faker.string.hexadecimal({ length: 32, prefix: '' })}-DID`;
            item.userGroup = this.pickRandomValue(UserGroup) as UserGroup;
            item.action = this.pickRandomValue(AuditOperations) as AuditOperations;
            return item;
          })
          break;
        }
        case Leaflet.name: {
          this.limit = 10;
          this.propFnMapper = {
            lang: () => this.pickRandomValue(['en', 'fr', 'de', 'it', 'es', 'pt', 'pt-br']),
            type: () => this.pickRandomValue(['leaflet', 'prescribingInfo']),
            productCode: () => {
              const productCode = `013`;
              return productCode.padStart(14, '0');
            }
            // productCode: () => `0${Math.floor(Math.random() * 5) + 1}`
          };
          data = await this.generateData<Leaflet>();
          break;
        }
        // case ProductStrength.name: {
        //   data = await this.generateData<ProductStrength>();
        //   data = data.map((item: Partial<ProductStrength>) => {
        //     const productCode = `013`;
        //     item.productCode = productCode.padStart(14, '0');
        //     return item as T;
        //   }) as T[];
        //   break;
        // }
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
