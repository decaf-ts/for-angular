import type {
  AllOperationKeys,
  Context,
  ContextOf,
  ContextualArgs,
  DirectionLimitOffset,
  EventIds,
  Repo,
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
import { KeyValue } from './types';

interface ObservableEvent {
  table: Constructor<Model> | string;
  event: AllOperationKeys;
  id: EventIds;
  args: ContextualArgs<ContextOf<Repo<Model>>>;
}

export class DecafAxiosHttpAdapter extends AxiosHttpAdapter {
  bookmark: Record<string, DirectionLimitOffset[]> = {};

  static disableEvents = false;
  static token: string =
    'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJPb3VndUFWelljdVZpY3JCWUl2OWF2UElXUFNVMi1Cc00wV3FoaUIzRV84In0.eyJleHAiOjE3ODM5MzcwNjcsImlhdCI6MTc4MzkzNjc2NywiYXV0aF90aW1lIjoxNzgzOTM2NzY3LCJqdGkiOiJlNTUzNDBiMy0zNzFiLTc4ZTMtNzA2ZC1iOTBiNDlkNzM4OTgiLCJpc3MiOiJodHRwczovL2tleWNsb2FrLnB0cC5pbnRlcm5hbC9yZWFsbXMvcGRtIiwiYXVkIjoicGRtLW9hdXRoIiwic3ViIjoiMGFmZjQ4MDUtMjNmZS00MzJiLWE1OTgtMGJhZWFjZjBiZjU0IiwidHlwIjoiSUQiLCJhenAiOiJwZG0tb2F1dGgiLCJzaWQiOiJhZjhhNTY5ZS0xZmI0LWY3NDYtNzQxNC01N2Q3OTVjMzdlNGYiLCJhdF9oYXNoIjoiNUNtdzh2Y1Q4RDBZbmpkeGdsRXVFZyIsImFjciI6IjEiLCJyZXNvdXJjZV9hY2Nlc3MiOnsicGRtLW9hdXRoIjp7InJvbGVzIjpbImVwaS1yZWFkZXIiLCJlcGktYWRtaW4iLCJlcGktd3JpdGVyIiwicGxhLXdyaXRlciIsInBsYS1yZWFkZXIiLCJwbGEtYWRtaW4iXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwibmFtZSI6IkRlbWVyc29uIE3DoXhpbW8gZGUgQ2FydmFsaG8iLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJkZW1lcnNvbi5jYXJ2YWxob0BwZG1mYy5jb20iLCJnaXZlbl9uYW1lIjoiRGVtZXJzb24iLCJmYW1pbHlfbmFtZSI6Ik3DoXhpbW8gZGUgQ2FydmFsaG8iLCJlbWFpbCI6ImRlbWVyc29uLmNhcnZhbGhvQHBkbWZjLmNvbSJ9.SrpVabm0LGBUKbRy4sAZJNTESO1CXsIZ9knZ7GTohRoOZgz31aAShYG7Fm1pNSDYr2ZU7NZANo-xqTeLpG5y3hO6seKY6NPwUtjuHmsDYRYU3t17tYGzfBSnivicgYzpHdezZDaMN5pEXPXUhmoO9qPr0FnbzR6yIUAOX-xbvERhuuNFIgulDi3d7L9u7o15L-Iv_zFmBL-3CIrcHQror01tkYFy037lX1Cl1z19-XuPNbYPGIyVUZbeIQd-TF1Ojt0VjB1tvshndRLt7FiKoRZlXyEyK6uWke1i9n18KjMGlNQvjwQ6OLGL82a_CD3UaLJk3dDdPQ_PeJCOsdw3EA';

  private updateObservers$ = new Subject<ObservableEvent>();

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
        // const hasBookmark = this.hasQueryParam(url, 'bookmark');
        // if (hasBookmark) {
        //   url = this.parseBookmarkURL(url);
        // }
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
  // override async parseResponse<M extends Model>(
  //   clazz: Constructor<M>,
  //   method: OperationKeys | string,
  //   res: (AxiosResponse & { body: unknown; error: Error | AxiosError }) | any
  // ) {
  //   if (method === PreparedStatementKeys.FIND_BY && res === '') {

  //   }
  //   return await super.parseResponse(clazz, method, res);
  // }

  // override async parseResponse<M extends Model>(
  //   clazz: Constructor<M>,
  //   method: OperationKeys | string,
  //   res: AxiosResponse & { body: unknown; error: Error | AxiosError }
  // ) {
  //   if (!res.status && method !== PersistenceKeys.STATEMENT) throw new InternalError('this should be impossible');
  //   if (res.status >= 400) {
  //     throw this.parseError(
  //       res?.request?.response ? JSON.parse(res.request.response)?.error : res.error || `${res.status}`
  //     );
  //   }
  //   if (!res.body && res.data) {
  //     res.body = { data: JSON.parse(res.data) };
  //   }

  // res = await super.parseResponse(clazz, method, res);
  //   switch (method) {
  //     case BulkCrudOperationKeys.CREATE_ALL:
  //     case BulkCrudOperationKeys.READ_ALL:
  //     case BulkCrudOperationKeys.UPDATE_ALL:
  //     case BulkCrudOperationKeys.DELETE_ALL:
  //     case OperationKeys.CREATE:
  //     case OperationKeys.READ:
  //     case OperationKeys.UPDATE:
  //     case OperationKeys.DELETE:
  //       return res?.data || res?.body || undefined;
  //     case PreparedStatementKeys.FIND_BY:
  //     case PreparedStatementKeys.LIST_BY:
  //     case PreparedStatementKeys.PAGE_BY:
  //     case PreparedStatementKeys.FIND_ONE_BY:
  //     case PersistenceKeys.STATEMENT:
  //       return !res || typeof res === 'string' ? [] : res?.data || res;
  //     default:
  //       return res?.data || res?.body || undefined;
  //   }
  // }
}
