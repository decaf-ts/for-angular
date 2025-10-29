import { DecafRepository, KeyValue } from 'src/lib/engine/types';
import { formatDate, getOnWindow } from 'src/lib/helpers/utils';
import { faker } from '@faker-js/faker';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import { Repository, uses } from '@decaf-ts/core';
import { FunctionLike } from 'src/lib/engine/types';
import { AIModel } from '../models/AIVendorModel';
import {  AIFeatures } from './contants';
import { DB_ADAPTER_PROVIDER } from 'src/lib/for-angular-common.module';
import { parseToNumber } from '@decaf-ts/ui-decorators';
import { DbAdapterFlavour } from '../app.config';

export class ForAngularRepository<T extends Model> {

  private data: T[] = [];

  private _repository: DecafRepository<Model> | undefined = undefined;

  constructor(protected model: string | Model, protected limit: number = 36) {}

  private get repository():  DecafRepository<Model> {
    if (!this._repository) {
      const modelName = typeof this.model === 'string' ? this.model : (this.model as Model).constructor.name;
      const constructor = Model.get(modelName);
      if (!constructor)
        throw new InternalError(
          `Cannot find model ${modelName}. was it registered with @model?`,
        );
      try {
        this.model = new constructor();
        const dbAdapterFlavour = getOnWindow(DB_ADAPTER_PROVIDER) || undefined;
        if(dbAdapterFlavour)
          uses(dbAdapterFlavour as string)(constructor);
        this._repository  = Repository.forModel(constructor);
      } catch (error: unknown) {
        throw new InternalError(
          (error as Error)?.message || error as string
        );
      }
    }
    return this._repository;
  }

  public async init(): Promise<void> {
    this._repository = this.repository;
    let data = await this._repository?.select().execute();
    // const pk = this._repository?.pk as string;
    if(!this.data?.length) {
      const name = (this.model as Model).constructor.name;
      switch(name) {
        case AIModel.name:
          data = await this.generateData<AIModel>(AIFeatures, 'features', Array.name);
          break;
        // case AIFeature.name:
        //   data = await this.generateData<AIFeature>(AIFeatures);
        //   break;
        default:
          data = await this.generateData();
      }
      data = DbAdapterFlavour === "ram" ?
      data = await Promise.all(
          data.map((item) => this.repository?.create(item))
        ) as T[] : await this.repository?.createAll(data) as T[];
    }
    this.data = data as T[] || [];
  }

 async generateData<T extends Model>(pkValues?: KeyValue, pk?: string, pkType?: string): Promise<T[]> {

    const limit = Object.values(pkValues || {}).length - 1 || this.limit;
    if(!pk)
      pk = this._repository?.pk as string;
    if(!pkType)
      pkType = Primitives.STRING;
    const props = Object.keys(this.model as KeyValue).filter((k) => ![pk, 'updatedBy', 'createdAt','createdBy', 'updatedAt'].includes(k));
    const dataProps: Record<string, FunctionLike> = {};
    for(const prop of props) {
      const type = Reflect.getMetadata("design:type", this.model as KeyValue, prop);
      switch((type?.name || "").toLowerCase()) {
        case 'string':
          dataProps[prop] = () => faker.lorem.word();
          break;
        case 'step':
          dataProps[prop] = () => faker.lorem.word();
          break;
        case 'email':
          dataProps[prop] = () => faker.internet.email();
          break;
        case 'number':
          dataProps[prop] = () => faker.number.int({ min: 1, max: 5 });
          break;
        case 'boolean':
          dataProps[prop] = () => faker.datatype.boolean();
          break;
        case 'date':
          dataProps[prop] = () => faker.date.past();
          break;
        case 'url':
          dataProps[prop] = () => faker.internet.url();
          break;
        case 'array':
          dataProps[prop] = () => faker.lorem.words({min: 2, max: 5}).split(' ');
          break;
        default:
          dataProps[prop] = () => faker.lorem.word();
          break;
      }
    }

    const data = getFakerData<T>(limit, dataProps, typeof this.model === 'string' ? this.model : this.model?.constructor.name);

    if(!pkValues)
      return data;

    const values = Object.values(pkValues as KeyValue);
    const iterated: (string | number)[] = [];
    function getPkValue(item: KeyValue): T {
      if (values.length > 0) {
        const randomIndex = Math.floor(Math.random() * values.length);
        const selected = values.splice(randomIndex, 1)[0];
        const value = pkType === Primitives.STRING ? selected : pkType === Primitives.NUMBER
            ? parseToNumber(selected) : pkType === Array.name ? [selected] : selected;
        iterated.push(value);
        item[pk as string] =
          pkType === Primitives.STRING ? selected : pkType === Primitives.NUMBER
            ? parseToNumber(selected) : pkType === Array.name ? [selected] : selected;
      }
      if(!iterated.includes(item[pk as string]))
        return item as T;
      return undefined as unknown as T;
    }
    const uids = new Set();
    return data
      .map((d) => getPkValue(d))
      .filter((item: KeyValue) => {
        if (!item || uids.has(item[pk])) return false;
        uids.add(item[pk]);
        return true;
      }) as T[];
    }
}

// function generateEmployes(limit = 100): EmployeeModel[] {
//   return getFakerData(limit, {
//     name: faker.person.fullName,
//     occupation: faker.person.jobTitle,
//     birthdate: () => faker.date.birthdate(),
//     hiredAt: (random: number = Math.floor(Math.random() * 5) + 1) =>
//       faker.date.past({ years: random }),
//   }, EmployeeModel.name);
// }

// function generateCatories(limit = 100): CategoryModel[] {
//   return getFakerData<CategoryModel>(limit, {
//     name: () =>
//       faker.commerce.department() +
//       ' ' +
//       faker.commerce.productAdjective() +
//       ' ' +
//       faker.commerce.productMaterial(),
//     description: () => faker.commerce.productDescription(),
//   }, CategoryModel.name);
// }

export function getFakerData<T extends Model>(
  limit = 100,
  data: Record<string, FunctionLike>,
  model?: string,
): T[] {
  let index = 1;
  return Array.from({ length: limit }, () => {
    const item = {} as T & { id: number; createdAt: Date };
    for (const [key, value] of Object.entries(data)) {
      const val = value();
      item[key as keyof T] = val.constructor === Date ? formatDate(val) : val;
    }
    // if((item as any)?.['code'])
    //   (item as any).code = `${index}`;
    // item.id = index;
    // item.createdAt = faker.date.past({ refDate: '2025-01-01' });
    index  = index + 1;
    return (!model ? item : Model.build(item, model)) as T;
  });
}
