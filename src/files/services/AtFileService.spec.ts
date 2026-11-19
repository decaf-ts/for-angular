import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import type { Observable } from "rxjs";
import { AtFileService } from "./AtFileService";
import { INDEX_TTL_MS } from "../utils";
import type { AtFileSearchResult, AtFileSettings } from "../types";

const RESULT: AtFileSearchResult = {
  files: [{ path: "/workspace/src/index.ts", relative: "src/index.ts", kind: "file" }],
  truncated: false,
};

const SETTINGS: AtFileSettings = {
  enabled: true,
  ignoreFiles: ["desktop.ini"],
  ignoreFilesConfigured: true,
  workspaceIgnoreFiles: [],
  ignorePastedMentions: true,
};

function collect<T>(observable: Observable<T>): { values: T[] } {
  const bag = { values: [] as T[] };
  observable.subscribe((value) => bag.values.push(value));
  return bag;
}

describe("AtFileService", () => {
  let service: AtFileService;
  let http: HttpTestingController;
  let now: jest.SpyInstance<number, []>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AtFileService,
      ],
    });
    service = TestBed.inject(AtFileService);
    http = TestBed.inject(HttpTestingController);
    now = jest.spyOn(Date, "now").mockReturnValue(1_000);
  });

  afterEach(() => {
    http.verify();
    now.mockRestore();
    TestBed.resetTestingModule();
  });

  it("loads and updates settings over the files endpoints", () => {
    const loaded = collect(service.getSettings());
    http.expectOne("/files/settings").flush(SETTINGS);
    expect(loaded.values).toEqual([SETTINGS]);

    const update = { field: "enabled" as const, value: false };
    const updated = collect(service.updateSettings(update));
    const request = http.expectOne("/files/settings");
    expect(request.request.method).toBe("PUT");
    expect(request.request.body).toEqual(update);
    request.flush({ ...SETTINGS, enabled: false });
    expect(updated.values).toEqual([{ ...SETTINGS, enabled: false }]);
  });

  it("searches the global index without a query string", () => {
    const result = collect(service.search());
    const request = http.expectOne("/files/search");
    expect(request.request.method).toBe("GET");
    request.flush(RESULT);

    expect(result.values).toEqual([RESULT]);
  });

  it("encodes the session id into the URL", () => {
    const result = collect(service.search("session / a"));
    const request = http.expectOne(
      "/files/search?sessionId=session%20%2F%20a"
    );
    request.flush(RESULT);

    expect(result.values).toEqual([RESULT]);
  });

  it("caches per key for 30 seconds and serves the cached value synchronously", () => {
    collect(service.search()).values;
    http.expectOne("/files/search").flush(RESULT);

    now.mockReturnValue(1_000 + INDEX_TTL_MS - 1);
    const cached = collect(service.search());
    http.expectNone("/files/search");
    expect(cached.values).toEqual([RESULT]);

    now.mockReturnValue(1_000 + INDEX_TTL_MS);
    const refreshed = collect(service.search());
    http.expectOne("/files/search").flush(RESULT);
    expect(refreshed.values).toEqual([RESULT]);
  });

  it("keeps separate cache entries for the global and session indexes", () => {
    collect(service.search()).values;
    http.expectOne("/files/search").flush(RESULT);
    collect(service.search("session-1")).values;
    http
      .expectOne("/files/search?sessionId=session-1")
      .flush({ ...RESULT, truncated: true });

    const global = collect(service.search());
    http.expectNone("/files/search");
    expect(global.values).toEqual([RESULT]);

    const session = collect(service.search("session-1"));
    http.expectNone("/files/search?sessionId=session-1");
    expect(session.values).toEqual([{ ...RESULT, truncated: true }]);
  });

  it("bypasses the cache with force and clears it with invalidate", () => {
    collect(service.search()).values;
    http.expectOne("/files/search").flush(RESULT);

    const forced = collect(service.search(undefined, true));
    http.expectOne("/files/search").flush({ ...RESULT, truncated: true });
    expect(forced.values).toEqual([{ ...RESULT, truncated: true }]);

    service.invalidate();
    const afterInvalidate = collect(service.search());
    http.expectOne("/files/search").flush(RESULT);
    expect(afterInvalidate.values).toEqual([RESULT]);
  });

  it("does not cache failed searches", () => {
    const failed = collect(service.search());
    http
      .expectOne("/files/search")
      .flush({ message: "boom" }, { status: 500, statusText: "Server Error" });
    expect(failed.values).toEqual([]);

    const retried = collect(service.search());
    http.expectOne("/files/search").flush(RESULT);
    expect(retried.values).toEqual([RESULT]);
  });
});
