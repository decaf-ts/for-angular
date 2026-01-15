import { faker } from '@faker-js/faker';
import { parseToNumber } from '@decaf-ts/ui-decorators';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import { Metadata, uses } from '@decaf-ts/decoration';
import { Repository } from '@decaf-ts/core';
import { DB_ADAPTER_FLAVOUR_TOKEN } from '../engine/constants';
import { DecafRepository, KeyValue, FunctionLike } from '../engine/types';
import { formatDate, getOnWindow } from './helpers';
import { LoggedClass } from '@decaf-ts/logging';

export class DecafFakerRepository<T extends Model> extends LoggedClass {

  protected propFnMapper?: KeyValue;

  protected data: T[] = [];

  protected _repository: DecafRepository<Model> | undefined = undefined;

  protected pk: string | undefined = undefined;

  protected pkType?: string;

  constructor(protected model: string | Model, protected limit: number = 36) {
    super();
  }

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
        const dbAdapterFlavour = getOnWindow(DB_ADAPTER_FLAVOUR_TOKEN) || undefined;
        if (dbAdapterFlavour) uses(dbAdapterFlavour as string)(constructor);
        this._repository = Repository.forModel(constructor);
        this.pk = Model.pk(constructor) as string;
        this.pkType = Metadata.type(this._repository.class, this.pk).name.toLowerCase()
      } catch (error: unknown) {
        throw new InternalError((error as Error)?.message || (error as string));
      }
    }
    return this._repository;
  }

  public async initialize(): Promise<void> {
    if (!this._repository) this._repository = this.repository;
  }

  async generateData<T extends Model>(values?: KeyValue, key?: string, keyType?: string): Promise<T[]> {
    const limit = values ? Object.values(values || {}).length : this.limit;
    if (!key)
      key = Model.pk(this.repository.class) as string;

    if (!keyType)
      keyType = Metadata.type(this.repository.class, key).name.toLowerCase() as string;

    const modelProperties = this.getModelProperties(key, keyType);
    const dataFunctions: Record<string, FunctionLike> = {};
    for (const prop of modelProperties) {
      const fn = this.propFnMapper?.[prop] as FunctionLike || undefined;
      if(fn && typeof fn === Function.name.toLowerCase()) {
        dataFunctions[prop] =  () => fn() as FunctionLike;
        continue;
      }
      dataFunctions[prop] = this.getPropValueFn(prop, key);
    }

    const data = getFakerData<T>(
      limit,
      dataFunctions,
      (typeof this.model === 'string') ? this.model : this.model?.constructor.name
    );

    if (!values) return data;

    const _values = Object.values(values as KeyValue);
    const iterated: (string | number)[] = [];

    function getPkValue(item: KeyValue): T {
      if (_values.length > 0) {
        const randomIndex = Math.floor(Math.random() * _values.length);
        const selected = _values.splice(randomIndex, 1)[0];
        const value =
          keyType === Primitives.STRING
            ? selected
            : keyType === Primitives.NUMBER
              ? parseToNumber(selected)
              : keyType === Array.name
                ? [selected]
                : selected;
        item[key as string] = value;
      }
      if (!iterated.includes(item[key as string])) {
        iterated.push(item[key as string]);
        return item as T;
      }
      return undefined as unknown as T;
    }
    const uids = new Set();
    return data
      .map((d) => getPkValue(d))
      .filter((item: KeyValue) => {
        if (!item || uids.has(item[key]) || !item[key] || item[key] === undefined)
          return false;
        uids.add(item[key]);
        return true;
      })
      .filter(Boolean) as T[];
  }


  protected pickRandomValue(source: string[] | KeyValue): string  {
    const values: string[] = Array.isArray(source) ? source : Object.values(source);
    return !values?.length ?
      "" : `${values[Math.floor(Math.random() * values.length)]}`;
  }

  protected getModelProperties(pk: string, pkType: string): string[] {
     return Object.keys(this.model as KeyValue).filter((k) => {
      if (pkType === Primitives.STRING)
        return !['updatedBy', 'createdAt', 'createdBy', 'updatedAt'].includes(k);
      return ![pk, 'updatedBy', 'createdAt', 'createdBy', 'updatedAt'].includes(k);
    })
  }

  protected getPropValueFn(propName: string, pkName: string): FunctionLike {
    const type = Metadata.type(this.repository.class, propName);
     switch (type.name.toLowerCase()) {
        case 'string':
          return () =>
            `${faker.lorem.word()} ${pkName === propName ? ' - ' + faker.number.int({ min: 1, max: 200 }) : ''}`;
        case 'step':
          return () => faker.lorem.word();
        case 'email':
          return () => faker.internet.email();
        case 'number':
          return () => faker.number.int({ min: 1, max: 5 });
        case 'boolean':
          return () => faker.datatype.boolean();
        case 'date':
          return () => faker.date.past();
        case 'url':
          return () => faker.internet.url();
        case 'array':
          return () => faker.lorem.words({ min: 2, max: 5 }).split(' ');
        default:
          return () => undefined;
      }

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
      item[key] = val?.constructor === Date ?
        formatDate(val) : typeof val === Primitives.STRING ? String(val)?.trim() : val;
    }
    index = index + 1;
    return (!model ? item : Model.build(item, model)) as T;
  });
}
