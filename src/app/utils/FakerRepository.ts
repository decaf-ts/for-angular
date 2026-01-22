import { Model } from '@decaf-ts/decorator-validation';
import { DecafRepository } from 'src/lib/engine/types';
import { AIModel } from '../models/AIVendorModel';
import { AIFeatures } from './contants';
import { DecafFakerRepository } from 'src/lib/utils/DecafFakerRepository';
import { Product } from '../ew/fabric/Product';
import { Batch } from '../ew/fabric/Batch';
import { faker } from '@faker-js/faker';
import { Leaflet, LeafletType } from '../ew/fabric/Leaflet';
import { Audit } from '../ew/fabric/Audit';
import { AuditOperations, UserGroup } from '../ew/fabric/constants';
import { ProductStrength } from '../ew/fabric/ProductStrength';
import { getModelAndRepository } from 'src/lib/engine/helpers';
enum ProductNames {
  aspirin = 'Aspirin',
  ibuprofen = 'Ibuprofen',
  // paracetamol = 'Paracetamol',
  // amoxicillin = 'Amoxicillin',
  // azithromycin = 'Azithromycin',
  // metformin = 'Metformin',
  // atorvastatin = 'Atorvastatin',
  // omeprazole = 'Omeprazole',
  // simvastatin = 'Simvastatin',
  // levothyroxine = 'Levothyroxine',
  // lisinopril = 'Lisinopril',
  // losartan = 'Losartan',
  // hydrochlorothiazide = 'Hydrochlorothiazide',
  // prednisone = "Prednisone",
  // sertraline = "Sertraline",
  // fluoxetine = "Fluoxetine",
  // alprazolam = "Alprazolam",
  // diazepam = "Diazepam",
  // tramadol = "Tramadol",
  // codeine = "Codeine",
  // sildenafil = "Sildenafil",
  // insulin = "Insulin",
  // clopidogrel = "Clopidogrel",
  // furosemide = "Furosemide"
}

export class FakerRepository<T extends Model> extends DecafFakerRepository<T> {
  public override async initialize(): Promise<void> {
    await super.initialize();
    const repo = this._repository as DecafRepository<Model>;
    const model = this.model as Model;
    let data = await repo.select().execute();
    if (!this.data?.length) {
      const name = model.constructor.name;
      switch (name) {
        case AIModel.name:
          data = await this.generateData<AIModel>(AIFeatures, 'features', 'name');
          break;
        case Audit.name: {
          // data = (await this.generateData<Audit>()).map((item: Audit, index: number) => {
          //   const user = faker.internet.email().toLowerCase();
          //   item.userId = user;
          //   item.userGroup = this.pickRandomValue(UserGroup) as UserGroup;
          //   item.action = this.pickRandomValue(AuditOperations) as AuditOperations;
          //   item.transaction = this.pickRandomValue(['create', 'read', 'update', 'delete']);
          //   item.diffs = {};
          //   if (index % 2 === 0) item.diffs = { a: 'b' };
          //   return item;
          // });
          break;
        }
        case Product.name: {
          this.limit = 2;
          data = (await this.generateData<T & Product>(ProductNames, 'inventedName', 'string')).map(
            (item: Partial<Product>, index: number) => {
              item.productCode = index === 1 ? '00000000000013' : `0${index + 1}`.padStart(14, '0');
              delete item?.['imageData'];
              item.markets = [];
              item.strengths = [];
              return item as T;
            },
          );
          break;
        }
        case Batch.name: {
          const repo = getModelAndRepository('Product');
          this.limit = 1;
          data = await this.generateData<Batch>();
          data = [
            ...(await Promise.all(
              data.map(async (item: Partial<Batch>) => {
                const productCode =
                  this.limit === 1
                    ? '00000000000013'
                    : `0${Math.floor(Math.random() * 5) + 1}`.padStart(14, '0');
                const repo = getModelAndRepository('Product');
                item.productCode = productCode;
                item.enableDaySelection = true;
                if (repo) {
                  const { repository } = repo;
                  const product = (await repository.read(productCode)) as Product;
                  item['inventedName'] = item['nameMedicinalProduct'] = product.inventedName;
                }
                item.batchNumber = `bt_${productCode}_aspirin`.trim();
                // item.batchNumber = `bt_${productCode}_${item['nameMedicinalProduct']}`.trim();

                item.expiryDate = '251200';

                return item as T;
              }),
            )),
          ];
          break;
        }
        case Leaflet.name: {
          this.limit = 2;
          this.propFnMapper = {
            lang: () => this.pickRandomValue(['en', 'pt-br']),
            productCode: () => {
              const productCode = `013`;
              return productCode.padStart(14, '0');
            },
            epiMarket: () => this.pickRandomValue(['al', 'br']),
          };
          const repo = getModelAndRepository('Batch');
          let batches = [] as { batchNumber: string; productCode: string }[];
          if (repo) {
            const { repository } = repo;
            const query = (await repository.select().execute()) as Batch[];
            if (query.length)
              batches = query.map((item) => {
                return {
                  batchNumber: item.batchNumber,
                  productCode: item.productCode,
                };
              });
          }
          const products = batches.map((b) => b.productCode);
          data = (await this.generateData<Leaflet>()).map((item) => {
            // item.epiMarket = this.pickRandomValue([... getMarkets().map(({value}) => value)]);
            item.leafletType = this.pickRandomValue(LeafletType) as LeafletType;
            item.otherFilesContent = [];
            // item.productCode = this.pickRandomValue(products);
            item.batchNumber = batches.find((b) => b.productCode === item.productCode)?.batchNumber;
            item.createdAt = item.updatedAt = faker.date.past({ years: 10 });
            return item;
          });
          break;
        }
        case ProductStrength.name: {
          this.limit = 2;
          data = await this.generateData<ProductStrength>();
          data = data.map((item: Partial<ProductStrength>, index: number) => {
            item['productCode'] = index % 2 === 0 ? '00000000000012' : '00000000000013';
            item.substance = this.pickRandomValue(ProductNames);
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
        this.log
          .for(this.initialize)
          .error(
            `Error on populate ${this.model?.constructor.name}: ${(error as Error)?.message || (error as string)}`,
          );
      }
    }
    this.data = data as T[];
  }
}
