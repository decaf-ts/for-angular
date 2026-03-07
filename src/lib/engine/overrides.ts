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
    super({ eventsListenerPath: '/events', ...config }, alias);
  }

  token: string =
    'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJyOTJQVHlER0lteXN2aWhJTnc5bGJ0MS1WbHNmRWxtdUwzREMyWjNtOXVZIn0.eyJleHAiOjE3NzI4NTEwMjEsImlhdCI6MTc3Mjg1MDcyMSwiYXV0aF90aW1lIjoxNzcyODQ1OTQzLCJqdGkiOiJkNTljOGJmNS1lOTMyLTM5NjQtYzg0OC1lZGU1NmVmNjk2ODMiLCJpc3MiOiJodHRwczovL2tleWNsb2FrLnB0cC5pbnRlcm5hbC9yZWFsbXMvcGRtIiwiYXVkIjoicGRtLW9hdXRoIiwic3ViIjoiNjZjZDA3MmUtNzljNi00Y2Q4LWI3NzUtNDVmMWRkYzc5MjdjIiwidHlwIjoiSUQiLCJhenAiOiJwZG0tb2F1dGgiLCJzaWQiOiI2YTY3Yjg2MC0wNTQ1LTg3ZTktYzYzZC0xYTZjMzdjODU4MWIiLCJhdF9oYXNoIjoidk9oMkROZVYzUFh0d0toTTRFbGZkZyIsImFjciI6IjEiLCJyZXNvdXJjZV9hY2Nlc3MiOnsicGRtLW9hdXRoIjp7InJvbGVzIjpbImVwaS1hZG1pbiIsImVwaS1yZWFkZXIiLCJlcGktd3JpdGVyIiwicGxhLXdyaXRlciIsInBsYS1yZWFkZXIiLCJwbGEtYWRtaW4iXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwibmFtZSI6IkRlbWVyc29uIE3DoXhpbW8gZGUgQ2FydmFsaG8iLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJkZW1lcnNvbi5jYXJ2YWxob0BwZG1mYy5jb20iLCJnaXZlbl9uYW1lIjoiRGVtZXJzb24iLCJmYW1pbHlfbmFtZSI6Ik3DoXhpbW8gZGUgQ2FydmFsaG8iLCJlbWFpbCI6ImRlbWVyc29uLmNhcnZhbGhvQHBkbWZjLmNvbSJ9.Kmrf0oUQh2RE-cu8oFcNr-d4HKVAutzchLUVWtXOEPnNIl4p7A0x6WiTJIBgfhRCGmj7ALDdJTdbTqWNQxHU_YcwW7tEpwKQXKfVPKzxuWnPAWFxGNnXWiMk--PgMXLpNNt5VCQm37OwBA8f7qOIKscPTBVu0Z1z1NJpqvJSYjFtgzs4CMda-5stGC-_DzyAcBp6Ja6o5_jTTGu4W5YZWrkTgncU7fhDI2d-AsYs0by4StNEDq1UjJi26h9_HAkqDKO5OmgNefTc9kDVA_63mIKx9wJ8LfiWN3kYN4c55BLHA4LD0Sx9COKSzFrJJhq-ylNid8G9pA9QReQJQ_0mlQ';

  parseStatementURL(url: string): string {
    const urlArray = url.split('/');
    if (urlArray.includes(PersistenceKeys.STATEMENT) && !urlArray.includes(PreparedStatementKeys.PAGE_BY)) {
      if (urlArray.includes(PreparedStatementKeys.FIND)) {
        const direction = urlArray.pop();
        url = urlArray.filter((part) => part !== PersistenceKeys.STATEMENT).join('/');
        url = `${url}?direction=${direction}`;
      } else {
        return urlArray.filter((part) => part !== PersistenceKeys.STATEMENT).join('/');
      }
    }
    return url;
  }

  override async request<V>(details: AxiosRequestConfig, ...args: ContextualArgs<Context<AxiosFlags>>): Promise<V> {
    let overrides = {};
    try {
      const { ctx } = this.logCtx(args, this.request);
      overrides = this.toRequest(ctx);
    } catch (err: unknown) {
      // do nothing
    }
    if (this.token) {
      overrides = {
        withCredentials: true,
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
