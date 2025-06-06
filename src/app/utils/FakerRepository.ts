import { faker } from '@faker-js/faker';
import { formatDate, Model, ModelArg } from '@decaf-ts/decorator-validation';
import { EmployeeModel } from '../models/EmployeeModel';
import { CategoryModel } from '../models/CategoryModel';
import { PaginatedQuery } from 'src/lib/engine/NgxBaseComponent';
import { KeyValue } from 'src/lib/engine/types';
import { getInjectablesRegistry } from 'src/lib/helpers/utils';
import { consoleError } from 'src/lib/helpers/logging';

const localStorage = globalThis.localStorage;

export class FakerRepository<T> extends Model {
  private data: T[] = [];

  private storageKey: string = 'for_angular_faker_db';

  protected table!: string;

  private queryPage: number = 1;

  private pk: string = 'id';

  constructor(table?: string, args: ModelArg<Model> = {}) {
    super(args);
    if (table) this.table = table;
    if (!Object.keys(this.data)?.length) this.init(100);
    // if(model instanceof Model) {
    // console.log('registrando model ' + model.constructor.name);
    // getInjectablesRegistry().register(this, model.constructor.name);
    // }
  }

  private init(initialLength: number): void {
    if (!localStorage.getItem(this.storageKey)) {
      const initialData: Record<string, T[]> = {
        employees: generateEmployes() as T[],
        categories: generateCatories() as T[],
      };
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
    }
    this.data = this.getDb()[this.table] || [];
  }

  private getDb(): Record<string, T[]> {
    return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
  }

  private saveData(data: Record<string, T[]>): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    this.getDb();
  }

  async create(item: KeyValue): Promise<T | null> {
    try {
      const data = this.getDb();
      if (!data[this.table]) return null;
      const highestId = data[this.table].length
        ? Math.max(...data[this.table].map((i) => (i as T & { id: number }).id))
        : 0;
      const newItem = {
        id: highestId + 1,
        createdAt: new Date(),
        ...item,
      } as T;
      data[this.table].push(newItem);
      this.saveData(data);
      return newItem as T;
    } catch (error: any) {
      consoleError(this, error?.message || error);
      return null;
    }
  }

  async read(id?: string, model?: Model): Promise<Model | T[] | null> {
    try {
      if (!id) return this.readAll() as T[];
      console.log(id);
      console.log(this.data);
      let result =
        this.data.find(
          (item) => Number((item as { id: number })?.['id']) === Number(id)
        ) || null;
      (result as any) = new (Model.get(this.constructor.name) as any)(
        result
      ) as Model;
      console.log(result);
      return result as Model | T[] | null;
    } catch (error: any) {
      consoleError(this, error?.message || error);
      return null;
    }
  }

  update(id: number, updatedItem: Partial<T>): T | null {
    const data = this.getDb();
    if (!data[this.table]) return null;

    const index = data[this.table].findIndex(
      (item) => (item as T & { id: number }).id === id
    );
    if (index !== -1) {
      data[this.table][index] = { ...data[this.table][index], ...updatedItem };
      this.saveData(data);
      return data[this.table][index];
    }

    return null;
  }

  delete(id: number): T | null {
    const data = this.getDb();
    if (!data[this.table]) return null;

    const index = data[this.table].findIndex(
      (item) => (item as T & { id: number }).id === id
    );
    if (index !== -1) {
      const item = data[this.table].splice(index, 1)[0];
      this.saveData(data);
      return item;
    }

    return null;
  }

  readAll(string?: []): T[] {
    return this.data || [];
  }
  async find(value: string): Promise<T[]> {
    return this.data.filter((item: T) =>
      Object.values(item as KeyValue).some((val) =>
        `${val}`
          .toString()
          .toLowerCase()
          .includes((value as string)?.toLowerCase())
      )
    );
  }

  async paginate(start: number, limit: number): Promise<PaginatedQuery> {
    return new Promise((resolve) => {
      const res = {
        _currentPage: this.queryPage,
        total: this.data.length,
        page: this.data.slice(start, limit) as Model[],
      };
      this.queryPage++;
      return resolve(res);
    });
  }
}

function generateEmployes(limit: number = 100): EmployeeModel[] {
  return getFakerData<EmployeeModel>(100, {
    name: faker.person.fullName,
    occupation: faker.person.jobTitle,
    birthdate: faker.date.birthdate,
    hiredAt: (random: number = Math.floor(Math.random() * 5) + 1) =>
      faker.date.past({ years: random }),
  });
}

function generateCatories(limit: number = 100): CategoryModel[] {
  return getFakerData<CategoryModel>(100, {
    name: () =>
      faker.commerce.department() +
      ' ' +
      faker.commerce.productAdjective() +
      ' ' +
      faker.commerce.productMaterial(),
    description: faker.commerce.productDescription,
  });
}

export function getFakerData<T>(
  limit: number = 100,
  model: Record<string, Function>
): T[] {
  let index = 1;
  return Array.from({ length: limit }, () => {
    const item = {} as T & { id: number; createdAt: Date };
    for (const [key, value] of Object.entries(model)) {
      const val = value();
      item[key as keyof T] = val.constructor === Date ? formatDate(val) : val;
    }
    item.id = index;
    item.createdAt = faker.date.past({ refDate: '2024-01-01' });
    index++;
    return item;
  });
}
