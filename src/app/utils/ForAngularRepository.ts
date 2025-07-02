import { DecafRepository, DecafRepositoryAdapter } from 'src/lib/components/list/constants';
import { formatDate } from 'src/lib/helpers/utils';
import { faker } from '@faker-js/faker';
import { Model } from '@decaf-ts/decorator-validation';
import { EmployeeModel } from '../models/EmployeeModel';
import { CategoryModel } from '../models/CategoryModel';
import { KeyValue } from 'src/lib/engine/types';
import { InternalError } from '@decaf-ts/db-decorators';
import { Repository } from '@decaf-ts/core';
import { FunctionType } from 'src/lib/helpers/types';

export class ForAngularRepository<T extends Model> {

  private data: T[] = [];

  private _repository: DecafRepository<Model> | undefined = undefined;

  constructor(protected adapter: DecafRepositoryAdapter, protected model?: string | Model) {}

  private get repository():  DecafRepository<Model> {
    if (!this._repository) {
      const constructor = Model.get(typeof this.model === 'string' ? this.model : (this.model as Model).constructor.name);
      if (!constructor)
        throw new InternalError(
          'Cannot find model. was it registered with @model?',
        );
      try {
        this.model = new constructor();
        this._repository  = Repository.forModel(constructor, (this.adapter as DecafRepositoryAdapter).flavour);
        // this.init(new constructor());
      } catch (errror: any) {
        throw new InternalError(
          errror.message,
        );
      }
    }
    return this._repository;
  }

  public async init(): Promise<void> {
    this._repository = this.repository;
    let data = await this._repository?.select().execute();
    if(!this.data?.length) {
      const items = 55;
      data = ((this.model as Model).constructor.name !== 'CategoryModel' ? generateEmployes(items) : generateCatories(items)) as Model[];
      // const model = new (Model.get(this.modelName) as ModelConstructor<T>)();
      // const created = await this.repository?.create(data[0] as Model);
      // console.log(created);
      data = await this.repository?.createAll(data) as T[];
    }
    this.data = data as T[] || [];
  }

  public async getAll(): Promise<Model[]> {
    return await this._repository?.select().execute() || [];
  }

  async read(id: string, model?: Model): Promise<Model> {
    const res = await this._repository?.read(id) as Model;
    console.log(res);
    return res;
  }
}

function generateEmployes(limit = 100): EmployeeModel[] {
  return getFakerData(limit, {
    name: faker.person.fullName,
    occupation: faker.person.jobTitle,
    birthdate: faker.date.birthdate,
    hiredAt: (random: number = Math.floor(Math.random() * 5) + 1) =>
      faker.date.past({ years: random }),
  }, EmployeeModel.name);
}

function generateCatories(limit = 100): CategoryModel[] {
  return getFakerData<CategoryModel>(limit, {
    name: () =>
      faker.commerce.department() +
      ' ' +
      faker.commerce.productAdjective() +
      ' ' +
      faker.commerce.productMaterial(),
    description: () => faker.commerce.productDescription(),
  }, CategoryModel.name);
}

export function getFakerData<T extends Model>(
  limit = 100,
  data: Record<string, FunctionType>,
  model?: string,
): T[] {
  let index = 1;
  return Array.from({ length: limit }, () => {
    const item = {} as T & { id: number; createdAt: Date };
    for (const [key, value] of Object.entries(data)) {
      const val = value();
      item[key as keyof T] = val.constructor === Date ? formatDate(val) : val;
    }
    // item.id = index;
    // item.createdAt = faker.date.past({ refDate: '2024-01-01' });
    index++;
    return (!model ? item : Model.build(item, model)) as T;
  });
}
