import { DecafRepository, DecafRepositoryAdapter } from 'src/lib/components/list/constants';
import { formatDate } from 'src/lib/helpers/utils';
import { faker } from '@faker-js/faker';
import { Model } from '@decaf-ts/decorator-validation';
import { EmployeeModel } from '../models/EmployeeModel';
import { CategoryModel } from '../models/CategoryModel';
import { KeyValue } from 'src/lib/engine/types';
import { InternalError } from '@decaf-ts/db-decorators';
import { Repository } from '@decaf-ts/core';


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
    this.repository;
    let data = await this._repository?.select().execute();
    if(!this.data?.length) {
      data = ((this.model as Model).constructor.name !== 'CategoryModel' ? generateEmployes(50) : generateCatories(50)) as Model[];
      // const model = new (Model.get(this.modelName) as ModelConstructor<T>)();
      // const created = await this.repository?.create(data[0] as Model);
      // console.log(created);
      data = await this.repository?.createAll(data) as T[];
    }
    this.data = data as T[];
  }

  public async getAll(): Promise<Model[]> {
    return await this._repository?.select().execute() || [];
  }


  // (await repo?.query(Condition.attribute<T>("id").dif('null')) || this.data);




  // private getDb(): Record<string, T[]> {
  //   return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
  // }

  // private saveData(data: Record<string, T[]>): void {
  //   localStorage.setItem(this.storageKey, JSON.stringify(data));
  //   this.getDb();
  // }
  async create(item: KeyValue): Promise<Model | undefined> {
    return await this._repository?.create(Model.build(item));
  }
  // async create(item: KeyValue): Promise<T | null> {
  //   try {
  //     const data = this.getDb();
  //     if (!data[this.table]) return null;
  //     const highestId = data[this.table].length
  //       ? Math.max(...data[this.table].map((i) => (i as T & { id: number }).id))
  //       : 0;
  //     const newItem = {
  //       id: highestId + 1,
  //       createdAt: new Date(),
  //       ...item,
  //     } as T;
  //     data[this.table].push(newItem);
  //     this.saveData(data);
  //     return newItem as T;
  //   } catch (error: any) {
  //     consoleError(this, error?.message || error);
  //     return null;
  //   }
  // }
    async read(id: string, model?: Model): Promise<Model> {
      const res = await this._repository?.read(id) as Model;
      console.log(res);
      return res;
    }
  // async read(id?: string, model?: Model): Promise<Model | T[] | null> {
  //   try {
  //     if (!id) return this.readAll() as T[];
  //     console.log(id);
  //     console.log(this.data);
  //     let result =
  //       this.data.find(
  //         (item) => Number((item as { id: number })?.['id']) === Number(id)
  //       ) || null;
  //     (result as any) = new (Model.get(this.constructor.name) as any)(
  //       result
  //     ) as Model;
  //     console.log(result);
  //     return result as Model | T[] | null;
  //   } catch (error: any) {
  //     consoleError(this, error?.message || error);
  //     return null;
  //   }
  // }

  // update(id: number, updatedItem: Partial<T>): T | null {
  //   const data = this.getDb();
  //   if (!data[this.table]) return null;

  //   const index = data[this.table].findIndex(
  //     (item) => (item as T & { id: number }).id === id
  //   );
  //   if (index !== -1) {
  //     data[this.table][index] = { ...data[this.table][index], ...updatedItem };
  //     this.saveData(data);
  //     return data[this.table][index];
  //   }

  //   return null;
  // }

  // delete(id: number): T | null {
  //   const data = this.getDb();
  //   if (!data[this.table]) return null;

  //   const index = data[this.table].findIndex(
  //     (item) => (item as T & { id: number }).id === id
  //   );
  //   if (index !== -1) {
  //     const item = data[this.table].splice(index, 1)[0];
  //     this.saveData(data);
  //     return item;
  //   }

  //   return null;
  // }


  // async find(value: string): Promise<T[]> {
  //   console.log(this.data);
  //   console.log(await this.repo?.readAll([1]));
  //   return this.data.filter((item: T) =>
  //     Object.values(item as KeyValue).some((val) =>
  //       `${val}`
  //         .toString()
  //         .toLowerCase()
  //         .includes((value as string)?.toLowerCase())
  //     )
  //   );
  // }

  // async paginate(start: number, limit: number, direction: OrderDirection = OrderDirection.DSC): Promise<any> {
  //   const data = await this.repo?.query(
  //     Condition.attribute(this.repo.pk).dif('null'),
  //     this.repo.pk,
  //     direction,
  //     limit,
  //     start,
  //   );
  //   // const pk = this.repo?.pk as keyof Model;
  //   // const repo = this.repo as AppRepository<Model>;
  //   // const paginator: Paginator<Model> = await repo
  //   //   .select()
  //   //   .orderBy([pk, OrderDirection.ASC])
  //   //   .paginate(100)
  //   // const page = await paginator.page()
  //   console.log(start, limit);
  //   this.queryPage++;
  //   return {
  //     _currentPage: this.queryPage,
  //     total: (await this.repo?.select().execute() || []).length,
  //     page: data,
  //   };
  // }
}

function generateEmployes(limit: number = 100): EmployeeModel[] {
  return getFakerData(100, {
    name: faker.person.fullName,
    occupation: faker.person.jobTitle,
    birthdate: faker.date.birthdate,
    hiredAt: (random: number = Math.floor(Math.random() * 5) + 1) =>
      faker.date.past({ years: random }),
  }, EmployeeModel.name);
}

function generateCatories(limit: number = 100): CategoryModel[] {
  return getFakerData<CategoryModel>(100, {
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
  limit: number = 100,
  data: Record<string, Function>,
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
