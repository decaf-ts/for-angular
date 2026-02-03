import { AxiosFlags, AxiosFlavour, AxiosHttpAdapter, HttpConfig } from '@decaf-ts/for-http';
import { Axios, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ContextualArgs, Context, PersistenceKeys, PreparedStatementKeys } from '@decaf-ts/core';
import { BulkCrudOperationKeys, InternalError, OperationKeys } from '@decaf-ts/db-decorators';
import { Constructor } from '@decaf-ts/decoration';
import { Model } from '@decaf-ts/decorator-validation';

export class DecafAxiosHttpAdapter extends AxiosHttpAdapter {
  constructor(
    config: HttpConfig,
    alias: string = AxiosFlavour,
    protected enableCredentials: boolean = true,
  ) {
    super(config, alias);
  }

  token?: string;

  override async request<V>(
    details: AxiosRequestConfig,
    ...args: ContextualArgs<Context<AxiosFlags>>
  ): Promise<V> {
    let overrides = {};
    try {
      const { ctx } = this.logCtx(args, this.request);
      overrides = this.toRequest(ctx);
      // eslint-s
    } catch (e) {
      // do nothing
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

    const result = await this.client.request(Object.assign({}, details, overrides));
    return result as V;
  }

  override async parseResponse<M extends Model>(
    clazz: Constructor<M>,
    method: OperationKeys | string,
    res: AxiosResponse & { body: unknown; error: Error | AxiosError },
  ) {
    if (!res.status && method !== PersistenceKeys.STATEMENT)
      throw new InternalError('this should be impossible');
    if (res.status >= 400) {
      console.log(res instanceof AxiosError);
      throw this.parseError(
        res?.request?.response
          ? JSON.parse(res.request.response)?.error
          : res.error || `${res.status}`,
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
