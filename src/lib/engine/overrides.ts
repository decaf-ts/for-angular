import { Context, ContextualArgs, PersistenceKeys, PreparedStatementKeys } from '@decaf-ts/core';
import {
  BaseError,
  BulkCrudOperationKeys,
  InternalError,
  OperationKeys,
  PrimaryKeyType,
} from '@decaf-ts/db-decorators';
import { Constructor } from '@decaf-ts/decoration';
import { Model, ModelKeys } from '@decaf-ts/decorator-validation';
import { AxiosFlags, AxiosFlavour, AxiosHttpAdapter, HttpConfig } from '@decaf-ts/for-http';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

export class DecafAxiosHttpAdapter extends AxiosHttpAdapter {
  constructor(
    config: HttpConfig,
    alias: string = AxiosFlavour,
    protected enableCredentials: boolean = true
  ) {
    super(config, alias);
  }

  parseStatementURL(url: string): string {
    const urlArray = url.split('/');
    if (urlArray.includes(PersistenceKeys.STATEMENT) && !urlArray.includes(PreparedStatementKeys.PAGE_BY)) {
      return urlArray.filter((part) => part !== PersistenceKeys.STATEMENT).join('/');
    }
    return url;
  }

  token?: string;

  override async request<V>(details: AxiosRequestConfig, ...args: ContextualArgs<Context<AxiosFlags>>): Promise<V> {
    let overrides = {};
    try {
      const { ctx } = this.logCtx(args, this.request);
      overrides = this.toRequest(ctx);
    } catch (err: unknown) {
      this.log.debug(`Error generating request overrides: ${(err as Error).message}.`);
    }
    if (this.token) {
      overrides = {
        ...(this.enableCredentials ? { withCredentials: this.enableCredentials } : {}),
        headers: {
          authorization: `Bearer ${this.token}`,
          // 'access-control-allow-origin': '*',
        },
      };
    }
    const { method } = details || undefined;
    switch (method) {
      case 'PUT':
      case 'POST':
      case 'PATCH': {
        const headers = (overrides as AxiosRequestConfig)?.headers || {};
        overrides = {
          ...overrides,
          headers: {
            ...headers,
            'Content-Type': 'application/json; charset=utf-8',
          },
        };
        break;
      }
    }

    return await this.client.request(
      Object.assign({}, details, { url: this.parseStatementURL(details.url || '') }, overrides)
    );
  }

  override async create<M extends Model>(
    tableName: Constructor<M>,
    id: PrimaryKeyType,
    model: M,
    ...args: ContextualArgs<Context<AxiosFlags>>
  ): Promise<Record<string, unknown>> {
    const { log, ctx } = this.logCtx(args, this.create);
    try {
      const url = this.url(tableName);
      const cfg = this.toRequest(ctx);
      log.debug(`POSTing to ${url} with ${JSON.stringify(model)} and cfg ${JSON.stringify(cfg)} and primary key ${id}`);
      const result = await this.request<Record<string, unknown>>(
        {
          url,
          method: 'POST',
          data: JSON.stringify(
            Object.assign({}, model, {
              [ModelKeys.ANCHOR]: tableName.name,
            })
          ),
          ...cfg,
        },
        ctx
      );
      return result;
    } catch (error: unknown) {
      throw this.parseError(error as BaseError);
    }
  }

  override async parseResponse<M extends Model>(
    clazz: Constructor<M>,
    method: OperationKeys | string,
    res: AxiosResponse & { body: unknown; error: Error | AxiosError }
  ) {
    if (!res.status && method !== PersistenceKeys.STATEMENT) throw new InternalError('this should be impossible');
    if (res.status >= 400) {
      throw this.parseError(
        res?.request?.response ? JSON.parse(res.request.response)?.error : res.error || `${res.status}`
      );
    }
    if (!res.body && res.data) {
      res.body = { data: JSON.parse(res.data) };
    }

    res = await super.parseResponse(clazz, method, res);
    switch (method) {
      case BulkCrudOperationKeys.CREATE_ALL:
      case BulkCrudOperationKeys.READ_ALL:
      case BulkCrudOperationKeys.UPDATE_ALL:
      case BulkCrudOperationKeys.DELETE_ALL:
      case OperationKeys.CREATE:
      case OperationKeys.READ:
      case OperationKeys.UPDATE:
      case OperationKeys.DELETE:
        return res?.data || res?.body || undefined;
      case PreparedStatementKeys.FIND_BY:
      case PreparedStatementKeys.LIST_BY:
      case PreparedStatementKeys.PAGE_BY:
      case PreparedStatementKeys.FIND_ONE_BY:
      case PersistenceKeys.STATEMENT:
        return !res ? [] : res?.data || res;
      default:
        return res?.data || res?.body || undefined;
    }
  }
}
