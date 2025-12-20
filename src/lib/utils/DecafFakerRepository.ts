import { faker } from '@faker-js/faker';
import { parseToNumber } from '@decaf-ts/ui-decorators';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import { Metadata, uses } from '@decaf-ts/decoration';
import { Repository } from '@decaf-ts/core';
import { DB_ADAPTER_FLAVOUR_TOKEN } from '../for-angular-common.module';
import { DecafRepository, KeyValue, FunctionLike } from '../engine/types';
import { formatDate, getOnWindow } from './helpers';
import { LoggedClass } from '@decaf-ts/logging';

export class DecafFakerRepository<T extends Model> extends LoggedClass {

  protected propFnMapper?: KeyValue;

  protected data: T[] = [];

  protected _repository: DecafRepository<Model> | undefined = undefined;

  protected pk: string | undefined = undefined;

  protected pkType?: string;

  constructor(
    protected model: string | Model,
    protected limit: number = 36
  ) {
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
      keyType = Metadata.type(this.repository.class, key).name.toLowerCase();

    const props = Object.keys(this.model as KeyValue).filter((k) => {
      if (keyType === Primitives.STRING)
        return !['updatedBy', 'createdAt', 'createdBy', 'updatedAt'].includes(k);
      return ![key, 'updatedBy', 'createdAt', 'createdBy', 'updatedAt'].includes(k);
    });
    const dataProps: Record<string, FunctionLike> = {};
    for (const prop of props) {
      const type = Metadata.type(this.repository.class, prop);
      const fn = this.propFnMapper?.[prop] as FunctionLike || undefined;
      if(fn && typeof fn === 'function') {
        // dataProps[prop] = (fn as FunctionLike)() as unknown as FunctionLike;
        dataProps[prop] =  () => fn() as unknown as FunctionLike;
      } else {
        switch (type.name.toLowerCase()) {
          case 'string':
            dataProps[prop] = () =>
              `${faker.lorem.word()} ${key === prop ? ' - ' + faker.number.int({ min: 1, max: 200 }) : ''}`;
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
    }

    const data = getFakerData<T>(
      limit,
      dataProps,
      typeof this.model === 'string' ? this.model : this.model?.constructor.name
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
    index = index + 1;
    return (!model ? item : Model.build(item, model)) as T;
  });
}
