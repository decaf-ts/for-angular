import {
  AllOperationKeys,
  Context,
  ContextOf,
  ContextualArgs,
  DirectionLimitOffset,
  EventIds,
  PersistenceKeys,
  PreparedStatementKeys,
} from '@decaf-ts/core';
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
import { KeyValue } from './types';

export class DecafAxiosHttpAdapter extends AxiosHttpAdapter {
  static disableEvents = false;
  static token: string = ' ';
  bookmark: Record<string, DirectionLimitOffset[]> = {};

  constructor(config: HttpConfig & { events?: boolean }, alias: string = AxiosFlavour) {
    super(
      { eventHeaderResolver: DecafAxiosHttpAdapter.getEventHeaders, eventsListenerPath: '/events', ...config },
      AxiosFlavour
    );

    if (!config?.events) {
      DecafAxiosHttpAdapter.disableEvents = true;
    }
  }

  static getEventHeaders(): KeyValue {
    return !this.token || DecafAxiosHttpAdapter.disableEvents
      ? {}
      : {
          headers: {
            authorization: `Bearer ${this.token}`,
          },
        };
  }

  getAllRawQueryParams(url: string): Record<string, string> {
    const query = new URL(url).search.slice(1); // remove o '?'
    if (!query) return {};

    const params: Record<string, string> = {};

    for (const pair of query.split('&')) {
      const [key, value = ''] = pair.split('=');
      params[key] = value;
    }

    return params;
  }

  getBookmarkEntryKey(url: string): string | undefined {
    const parts = url.split('/'); // transforma em array
    const index = parts.indexOf(PersistenceKeys.STATEMENT);
    if (index > 0) {
      return parts[index - 1];
    }
    return undefined;
  }

  setOnBookmark(url: string): void {
    const key = this.getBookmarkEntryKey(url);
    if (key) {
      if (!this.bookmark[key]) {
        this.bookmark[key] = [];
      }
      this.bookmark[key].push(this.getAllRawQueryParams(url));
    }
  }

  parseBookmarkURL(url: string): string {
    let bookmark = this.getOnQueryParams(url, 'bookmark');
    const cached = this.getFromBookmark(url);
    if (!bookmark) {
      if (cached) {
        bookmark = cached.bookmark as string;
        url = url.replace(/bookmark=[^&]*/, `bookmark=${bookmark}`);
      }
    } else {
      if (cached?.bookmark && bookmark !== cached.bookmark) {
        url = url.replace(/bookmark=[^&]*/, `bookmark=${cached.bookmark}`);
      } else {
        this.setOnBookmark(url);
      }
    }
    return url;
  }

  getFromBookmark(url: string): DirectionLimitOffset | undefined {
    const key = this.getBookmarkEntryKey(url);
    const offset = this.getOnQueryParams(url, 'offset');
    if (key) {
      const cached = this.bookmark?.[key];
      if (Number(offset) <= 2) {
        this.bookmark[key] = [];
      }
      if (cached) {
        return cached.find((item) => Number(item.offset) === Number(offset));
      }
    }
    return undefined;
  }

  getOnQueryParams(url: string, param: string): string {
    return new URL(url).searchParams.get(param) || '';
  }

  hasQueryParam(url: string, param: string): boolean {
    return new URLSearchParams(url).has(param);
  }

  parseStatementURL(url: string): string {
    const urlArray = url.split('/');
    if (urlArray.includes(PersistenceKeys.STATEMENT)) {
      if (!urlArray.includes(PreparedStatementKeys.PAGE_BY)) {
        if (urlArray.includes(PreparedStatementKeys.FIND)) {
          const direction = urlArray.pop();
          url = urlArray.filter((part) => part !== PersistenceKeys.STATEMENT).join('/');
          url = `${url}?direction=${direction}`;
        } else {
          return urlArray.filter((part) => part !== PersistenceKeys.STATEMENT).join('/');
        }
      } else {
        const hasBookmark = this.hasQueryParam(url, 'bookmark');
        if (hasBookmark) {
          url = this.parseBookmarkURL(url);
        }
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

    if (DecafAxiosHttpAdapter.token) {
      overrides = {
        withCredentials: true,
        headers: {
          authorization: `Bearer ${DecafAxiosHttpAdapter.token}`,
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
        // if (details?.url?.includes('leaflet')) {
        //   const form = new FormData();
        //   const data = JSON.parse(details.data as string);
        //   for (const key in data) {
        //     const value = typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key];
        //     form.append(key, value);
        //   }
        //   details.data = form;
        //   overrides = {
        //     ...overrides,
        //     headers: {
        //       ...headers,
        //       'Content-Type': 'multipart/form-data',
        //     },
        //   };
        // }
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

  override async updateObservers<M extends Model>(
    table: Constructor<M> | string,
    event: AllOperationKeys,
    id: EventIds,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: ContextualArgs<ContextOf<any>>
  ) {
    if (!DecafAxiosHttpAdapter.disableEvents) {
      const [model] = args;
      if (!id) {
        const pk = Model.pk(Model.get(table as string));
        if (pk && pk in model) {
          id = model[pk] as EventIds;
        }
      }
      return await super.updateObservers(table, event, id, ...args);
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
        return !res || typeof res === 'string' ? [] : res?.data || res;
      default:
        return res?.data || res?.body || undefined;
    }
  }
}
