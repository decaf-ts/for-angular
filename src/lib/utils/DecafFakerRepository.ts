import { faker } from '@faker-js/faker';
import { parseToNumber } from '@decaf-ts/ui-decorators';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import { Metadata, uses } from '@decaf-ts/decoration';
import { Repository } from '@decaf-ts/core';
import { DB_ADAPTER_PROVIDER } from '../for-angular-common.module';
import { DecafRepository, KeyValue, FunctionLike } from '../engine/types';
import { formatDate, getOnWindow } from './helpers';

export class DecafFakerRepository<T extends Model> {
  protected data: T[] = [];

  protected _repository: DecafRepository<Model> | undefined = undefined;

  constructor(
    protected model: string | Model,
    protected limit: number = 36
  ) {}

  protected get repository(): DecafRepository<Model> {
    if (!this._repository) {
      const modelName =
        typeof this.model === 'string'
          ? this.model
          : (this.model as Model).constructor.name;
      const constructor = Model.get(modelName);
      if (!constructor)
        throw new InternalError(
          `Cannot find model ${modelName}. was it registered with @model?`
        );
      try {
        this.model = new constructor();
        const dbAdapterFlavour = getOnWindow(DB_ADAPTER_PROVIDER) || undefined;
        if (dbAdapterFlavour) uses(dbAdapterFlavour as string)(constructor);
        this._repository = Repository.forModel(constructor);
      } catch (error: unknown) {
        throw new InternalError((error as Error)?.message || (error as string));
      }
    }
    return this._repository;
  }

  public async initialize(): Promise<void> {
    if (!this._repository)
      this._repository = this.repository;
  }

  async generateData<T extends Model>(
    pkValues?: KeyValue,
    pk?: string,
    pkType?: string
  ): Promise<T[]> {
    const limit = pkValues
      ? Object.values(pkValues || {}).length - 1
      : this.limit;
    if (!pk) pk = (this._repository as any)['pk'] as string;
    if (!pkType)
      pkType = Metadata.type(this.repository.class, pk).name.toLowerCase();

    const props = Object.keys(this.model as KeyValue).filter((k) => {
      if (pkType === Primitives.STRING)
        return !['updatedBy', 'createdAt', 'createdBy', 'updatedAt'].includes(
          k
        );
      return ![pk, 'updatedBy', 'createdAt', 'createdBy', 'updatedAt'].includes(
        k
      );
    });
    const dataProps: Record<string, FunctionLike> = {};
    for (const prop of props) {
      const type =  Metadata.type(this.repository.class, prop).name.toLowerCase();
      switch ((type?.name || '').toLowerCase()) {
        case 'string':
          dataProps[prop] = () =>
            `${faker.lorem.word()} ${pk === prop ? ' - ' + faker.number.int({ min: 1, max: 200 }) : ''}`;
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
          dataProps[prop] = () =>
            faker.lorem.words({ min: 2, max: 5 }).split(' ');
          break;
      }
    }

    const data = getFakerData<T>(
      limit,
      dataProps,
      typeof this.model === 'string' ? this.model : this.model?.constructor.name
    );

    if (!pkValues) return data;

    const values = Object.values(pkValues as KeyValue);
    const iterated: (string | number)[] = [];

    function getPkValue(item: KeyValue): T {
      if (values.length > 0) {
        const randomIndex = Math.floor(Math.random() * values.length);
        const selected = values.splice(randomIndex, 1)[0];
        const value =
          pkType === Primitives.STRING
            ? selected
            : pkType === Primitives.NUMBER
              ? parseToNumber(selected)
              : pkType === Array.name
                ? [selected]
                : selected;
        item[pk as string] = value;
      }
      if (!iterated.includes(item[pk as string])) {
        iterated.push(item[pk as string]);
        return item as T;
      }
      return undefined as unknown as T;
    }
    const uids = new Set();
    return data
      .map((d) => getPkValue(d))
      .filter((item: KeyValue) => {
        if (!item || uids.has(item[pk]) || !item[pk] || item[pk] === undefined)
          return false;
        uids.add(item[pk]);
        return true;
      })
      .filter(Boolean) as T[];
  }
}

export function getFakerData<T extends Model>(
  limit = 100,
  data: Record<string, FunctionLike>,
  model?: string
): T[] {
  let index = 1;
  return Array.from({ length: limit }, () => {
    const item: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const val = value();
      item[key] = val?.constructor === Date ? formatDate(val) : val;
    }
    // if ((item as any)?.['code'])
    //   (item as any).code = `${index}`;
    // item.id = index;
    // item.createdAt = faker.date.past({ refDate: '2025-01-01' });
    index = index + 1;
    return (!model ? item : Model.build(item, model)) as T;
  });
}
