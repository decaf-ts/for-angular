import { HttpClient } from "@angular/common/http";
import { firstValueFrom, of } from "rxjs";
import { I18nLoader } from "./Loader";

describe("I18nLoader", () => {
  it("does not pollute Object.prototype when translation JSON contains hostile keys", async () => {
    // JSON.parse on purpose: an object literal would trigger the real setter
    const hostile = JSON.parse(
      '{"component": {"__proto__": {"polluted": "pwned"}, "ok": "kept"}}'
    );
    const http = { get: jest.fn().mockReturnValue(of(hostile)) };
    const loader = new I18nLoader(
      http as unknown as HttpClient,
      [{ prefix: "./i18n/", suffix: ".json" }]
    );

    const result = await firstValueFrom(loader.getTranslation("en"));

    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
    expect(Object.keys(result)).not.toContain("__proto__");
    expect((result as Record<string, unknown>)["component"]).toMatchObject({ ok: "kept" });
  });
});
