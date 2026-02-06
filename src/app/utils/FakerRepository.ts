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
import { generate } from 'rxjs';
import { generateGtin } from '../ew/fabric/gtin';
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

async function getProducts(): Promise<Product[]> {
  const repo = getModelAndRepository('Product');
  if (repo) {
    const { repository } = repo;
    const query = await repository.select().execute();
    if (query.length) {
      return query as Product[];
    }
  }
  return [];
}

async function getBatchs(): Promise<Batch[]> {
  const repo = getModelAndRepository('Batch');
  if (repo) {
    const { repository } = repo;
    const query = await repository.select().execute();
    if (query.length) {
      return query as Batch[];
    }
  }
  return [];
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
          this.propFnMapper = {
            productCode: () => generateGtin(),
          };
          data = (await this.generateData<T & Product>(ProductNames, 'inventedName', 'string')).map(
            (item: Partial<Product>, index: number) => {
              delete item?.['imageData'];
              item.markets = [];
              item.strengths = [];
              return item as T;
            },
          );
          break;
        }
        case Batch.name: {
          const products = await getProducts();
          this.limit = 2;
          data = await this.generateData<Batch>();
          data = [
            ...(await Promise.all(
              data.map(async (item: Partial<Batch>, index: number) => {
                const productCode = this.pickRandomValue(products.map((p) => p.productCode));
                const product = products.find((p) => p.productCode === productCode);
                item.productCode = productCode;

                item.batchNumber =
                  `bt_${productCode}_${index % 2 === 0 ? 'aspirin' : this.pickRandomValue(Object.values(ProductNames))}`.trim();
                // item.batchNumber = `bt_${productCode}_${item['nameMedicinalProduct']}`.trim();

                item.expiryDate =
                  index % 2 === 0
                    ? new Date('2026-12-30T00:00:00')
                    : new Date('2020-12-30T23:59:59');

                return item as T;
              }),
            )),
          ];
          break;
        }
        case Leaflet.name: {
          const products = await getProducts();
          this.limit = 2;
          this.propFnMapper = {
            productCode: () => this.pickRandomValue(products.map((p) => p.productCode)),
            lang: () => this.pickRandomValue(['en', 'pt-br']),
            epiMarket: () => this.pickRandomValue(['al', 'br']),
          };
          let batches = await getBatchs();
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
          const products = await getProducts();
          this.limit = 2;
          data = await this.generateData<ProductStrength>();
          data = data.map((item: Partial<ProductStrength>, index: number) => {
            item['productCode'] =
              index % 2 === 0 ? products[0].productCode : products[1].productCode;
            item.substance = this.pickRandomValue(ProductNames);
            return item as T;
          }) as T[];
          break;
        }
        default:
          data = [];
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
