import type {
  AllOperationKeys,
  Context,
  ContextOf,
  ContextualArgs,
  DirectionLimitOffset,
  EventIds,
} from '@decaf-ts/core';
import { PersistenceKeys, PreparedStatementKeys } from '@decaf-ts/core';
import type { PrimaryKeyType } from '@decaf-ts/db-decorators';
import { BaseError } from '@decaf-ts/db-decorators';
import type { Constructor } from '@decaf-ts/decoration';
import { Hashing, Model, ModelKeys } from '@decaf-ts/decorator-validation';
import type { AxiosFlags, HttpConfig } from '@decaf-ts/for-http';
import { AxiosFlavour, AxiosHttpAdapter } from '@decaf-ts/for-http';
import { AxiosRequestConfig } from 'axios';
import { auditTime, shareReplay, Subject } from 'rxjs';
import { IObservableEvent } from './interfaces';
import { KeyValue } from './types';

const CRUD_METHODS = new Set(['createAll', 'readAll', 'updateAll', 'deleteAll', 'create', 'read', 'update', 'delete']);
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export class DecafAxiosHttpAdapter extends AxiosHttpAdapter {
  bookmark: Record<string, DirectionLimitOffset[]> = {};

  static disableEvents = false;
  static token: string =
    'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJKQl9xUWRibTdBamFFZXh3THdFWjVMODlDUF9sVlRPTHFIbVZVX0hla3lNIn0.eyJleHAiOjE3Nzg2ODkwNDgsImlhdCI6MTc3ODY4ODc0OCwiYXV0aF90aW1lIjoxNzc4Njg3NjQ2LCJqdGkiOiJmNjkwYjM1YS0yYWNhLWNlNzAtNzZmYS05MmI0NTlhYjlhYWMiLCJpc3MiOiJodHRwczovL2tleWNsb2FrLnB0cC5pbnRlcm5hbC9yZWFsbXMvcGRtIiwiYXVkIjoicGRtLW9hdXRoIiwic3ViIjoiZGM1OGE1MTgtNzljMS00ZjRkLWFmNGEtNWM2MThlN2NjMDQ0IiwidHlwIjoiSUQiLCJhenAiOiJwZG0tb2F1dGgiLCJzaWQiOiJlZmQ1MDkyZC01OGIyLTViZmItYzBhOS01YzczNjc1M2FjYzIiLCJhdF9oYXNoIjoiejRMalRYZnA4U2YzQjRwRHQzUFEtdyIsImFjciI6IjEiLCJyZXNvdXJjZV9hY2Nlc3MiOnsicGRtLW9hdXRoIjp7InJvbGVzIjpbImVwaS1yZWFkZXIiLCJlcGktYWRtaW4iLCJlcGktd3JpdGVyIiwicGxhLXdyaXRlciIsInBsYS1yZWFkZXIiLCJwbGEtYWRtaW4iXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwibmFtZSI6IkRlbWVyc29uIE3DoXhpbW8gZGUgQ2FydmFsaG8iLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJkZW1lcnNvbi5jYXJ2YWxob0BwZG1mYy5jb20iLCJnaXZlbl9uYW1lIjoiRGVtZXJzb24iLCJmYW1pbHlfbmFtZSI6Ik3DoXhpbW8gZGUgQ2FydmFsaG8iLCJlbWFpbCI6ImRlbWVyc29uLmNhcnZhbGhvQHBkbWZjLmNvbSJ9.KPh_nOhdrC8ziEOPNN0nk74P2P4K7x0M3Jn8kXwgWpwyo26achLcfp_J2277eyjkOOBhqWYW6iYSPER8_LIAFyaXYHi2ehimqSfDic__oA0wLIaEYbi0FP88XXUX9BIH3Xu5OO0vF8-lo46jcOzgmq0EWthfiELzH4dHxMkmBfiiDsmBUNkpePM1m15rv15FUPNLQmWgR4DGs6L9G-oGATh_kZoeuIahaWl_9aZ9I80a5Lm7eNRB-oOBbafFlYdGrtDKG148BJ72Ek1dZisxXaD_yVtKAq-HKxSTjYt-UPw5PornGRU_G3fd0MP1bPmokxbTM3cE00fsDm8VOaa0Lg';
  private updateObservers$ = new Subject<IObservableEvent>();

  static lastEventId?: string;

  constructor(config: HttpConfig & { events?: boolean }, alias: string = AxiosFlavour) {
    super(
      { eventHeaderResolver: DecafAxiosHttpAdapter.getEventHeaders, eventsListenerPath: '/events', ...config },
      AxiosFlavour
    );
    if (config?.events === false) {
      DecafAxiosHttpAdapter.disableEvents = true;
    } else {
      this.updateObservers$
        .pipe(auditTime(0), shareReplay({ bufferSize: 1, refCount: true }))
        .subscribe(async ({ table, event, id, args }) => {
          await super.updateObservers(table, event, id, ...args);
        });
    }
  }

  static getEventHeaders(): KeyValue {
    return !this.token || DecafAxiosHttpAdapter.disableEvents
      ? {}
      : {
          withCredentials: true,
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
      // await super.updateObservers(table, event, id, ...args);
      const eventId = await Hashing.hash(`${table}, ${event}, ${id}, ${JSON.stringify(args)}`);
      if (eventId !== DecafAxiosHttpAdapter.lastEventId) {
        DecafAxiosHttpAdapter.lastEventId = eventId;
        this.updateObservers$.next({ table, event, id, args });
      }
    }
  }
  // fixed on HttpAdapter
  // override async parseResponse<M extends Model>(
  //   clazz: Constructor<M>,
  //   method: OperationKeys | string,
  //   res: AxiosResponse & { body: unknown; error: Error | AxiosError }
  // ) {
  //   if (!res.status && method !== PersistenceKeys.STATEMENT && String(method) !== HTTPMethods.GET)
  //     throw new InternalError('this should be impossible');
  //   if (res.status >= 400) {
  //     throw this.parseError(
  //       res?.request?.response ? JSON.parse(res.request.response)?.error : res.error || `${res.status}`
  //     );
  //   }
  //   if (!res.body && res.data) {
  //     res.body = { data: JSON.parse(res.data) };
  //   }

  //   res = await super.parseResponse(clazz, method, res);
  //   if (CRUD_METHODS.has(String(method))) return res?.data || res?.body || undefined;
  //   switch (method) {
  //     case PreparedStatementKeys.FIND_BY:
  //     case PreparedStatementKeys.LIST_BY:
  //     case PreparedStatementKeys.PAGE_BY:
  //     case PreparedStatementKeys.FIND_ONE_BY:
  //     case PersistenceKeys.STATEMENT:
  //       return !res || typeof res === Primitives.STRING ? [] : res?.data || res;
  //     default:
  //       return res?.data || res?.body || undefined;
  //   }
  // }
}
