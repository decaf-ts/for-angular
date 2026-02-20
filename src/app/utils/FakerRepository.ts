import { RamFlavour } from '@decaf-ts/core/ram';
import { uses } from '@decaf-ts/decoration';
import { Model, ModelConstructor } from '@decaf-ts/decorator-validation';
import axios from 'axios';
import { getModelAndRepository } from 'src/lib/engine/helpers';
import { DecafRepository } from 'src/lib/engine/types';
import { DecafFakerRepository } from 'src/lib/utils/DecafFakerRepository';
import { DbAdapterFlavour } from '../app.config';
import { Audit } from '../ew/fabric/Audit';
import { Batch } from '../ew/fabric/Batch';
import { generateGtin } from '../ew/fabric/gtin';
import { Leaflet } from '../ew/fabric/Leaflet';
import { Product } from '../ew/fabric/Product';
import { AIModel } from '../models/AIVendorModel';
import { AIFeatures } from './contants';

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

export async function populateSampleData(models: Model[], populate: string[], limit: number = 12): Promise<void> {
  if (DbAdapterFlavour === RamFlavour) {
    for (let model of models) {
      if (model instanceof Function) {
        model = new (model as unknown as ModelConstructor<Model>)();
      }
      const name = model.constructor.name.replace(/[0-9]/g, '');
      if (populate.includes(name)) {
        uses(RamFlavour)(model);
        const repository = new FakerRepository(model, limit);
        await repository.initialize();
      }
    }
  }
}

async function getQueryResults<M extends Model>(modelName: string): Promise<M[]> {
  const repo = getModelAndRepository(modelName);
  if (repo) {
    const { repository } = repo;
    const query = await repository.select().execute();
    if (query.length) {
      return query as M[];
    }
  }
  return [];
}

async function readProductFile(): Promise<string> {
  const filePath = '/assets/images/ew/product.txt';
  try {
    const response = await axios.get(filePath);
    return response.data || '';
  } catch (error: unknown) {
    console.error(`Error reading product.txt: ${(error as Error)?.message || (error as string)}`);
    throw error;
  }
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
          const image = await readProductFile();
          this.limit = 2;
          this.propFnMapper = {
            productCode: () => generateGtin(),
          };
          data = (await this.generateData(ProductNames, 'inventedName', 'string')).map((item: Partial<Product>) => {
            const productCode = item.productCode;
            // const imageData = {
            //   productCode,
            //   content: image,
            // } as ProductImage;
            // item.imageData = imageData;
            delete item.imageData;
            item.markets = [];
            item.strengths = [];
            return Model.build(item, Product.name) as T;
          });
          break;
        }
        case Batch.name: {
          const products = await getQueryResults<Product>('Product');
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

                item.expiryDate = index % 2 === 0 ? new Date('2026-12-30T00:00:00') : new Date('2020-12-30T23:59:59');

                return item as T;
              })
            )),
          ];
          break;
        }
        case Leaflet.name: {
          // const products = await getProducts();
          // this.limit = 2;
          // this.propFnMapper = {
          //   productCode: () => this.pickRandomValue(products.map((p) => p.productCode)),
          //   lang: () => this.pickRandomValue(['en', 'pt-br']),
          //   epiMarket: () => this.pickRandomValue(['al', 'br']),
          // };
          // let batches = await getBatchs();
          // data = (await this.generateData<Leaflet>()).map((item) => {
          //   // item.epiMarket = this.pickRandomValue([... getMarkets().map(({value}) => value)]);
          //   item.leafletType = this.pickRandomValue(LeafletType) as LeafletType;
          //   item.otherFilesContent = [];
          //   // item.productCode = this.pickRandomValue(products);
          //   item.batchNumber = batches.find((b) => b.productCode === item.productCode)?.batchNumber;
          //   item.createdAt = item.updatedAt = faker.date.past({ years: 10 });
          //   return item;
          // });
          break;
        }
        // case ProductStrength.name: {
        //   const products = await getProducts();
        //   this.limit = 2;
        //   data = await this.generateData<ProductStrength>();
        //   data = data.map((item: Partial<ProductStrength>, index: number) => {
        //     item['productCode'] =
        //       index % 2 === 0 ? products[0].productCode : products[1].productCode;
        //     item.substance = this.pickRandomValue(ProductNames);
        //     return item as T;
        //   }) as T[];
        //   break;
        // }
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
            `Error on populate ${this.model?.constructor.name}: ${(error as Error)?.message || (error as string)}`
          );
      }
    }
    this.data = data as T[];
  }
}
