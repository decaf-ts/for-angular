import {
  safeHref,
  safeMediaSrc,
  sanitizeEChartOption,
  sanitizeSvg,
  stripSecretFields,
} from "./sanitize";

/**
 * SAA-2026 A-1 binding regression.
 *
 * The previous implementation was a *blocklist* that scanned the raw markup for
 * literal `javascript:`/`on*=`/`<script` tokens. That cannot see through XML
 * entity encoding, percent encoding or mixed case: the browser decodes the
 * attribute value before navigating. This helper models that old blocklist so
 * the suite proves the hostile fixtures evade it and only the allowlist
 * sanitizer neutralizes them.
 */
const LEGACY_BLOCKLIST = /<script\b|on\w+\s*=|(?:javascript|vbscript|data)\s*:/gi;

function legacyBlocklistSanitize(markup: string): string {
  return markup.replace(LEGACY_BLOCKLIST, "");
}

function parseSvg(markup: string): SVGSVGElement {
  const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
  return parsed.documentElement as unknown as SVGSVGElement;
}

function assertNoHostileNavigation(markup: string): void {
  expect(markup.toLowerCase()).not.toContain("javascript");
  expect(markup.toLowerCase()).not.toContain("vbscript");
  expect(markup.toLowerCase()).not.toContain("data:");
  expect(markup).not.toMatch(/\son\w+\s*=/i);
  expect(markup).not.toMatch(/<\s*(script|foreignObject|style|animate|set)\b/i);
}

describe("sanitizeSvg (A-1 allowlist regression)", () => {
  it("neutralizes an entity-encoded javascript: href the legacy blocklist misses", () => {
    const vector =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="java&#x73;cript:alert(1)"/></svg>';

    // The old blocklist never sees `javascript:` because it is entity encoded.
    expect(LEGACY_BLOCKLIST.test(vector)).toBe(false);
    expect(legacyBlocklistSanitize(vector)).toContain("java&#x73;cript:");

    const cleaned = sanitizeSvg(vector);
    assertNoHostileNavigation(cleaned);
    const parsed = parseSvg(cleaned);
    expect(parsed.querySelector("use")).not.toBeNull();
    expect(parsed.querySelector("use")?.getAttribute("xlink:href")).toBeNull();
  });

  it("removes an entity-encoded javascript: href on a non-allowlisted <a> wrapper entirely", () => {
    const vector =
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="java&#x73;cript:alert(1)"><rect width="1" height="1"/></a></svg>';

    expect(LEGACY_BLOCKLIST.test(vector)).toBe(false);

    const cleaned = sanitizeSvg(vector);
    assertNoHostileNavigation(cleaned);
    expect(cleaned).not.toContain("<a ");
    expect(cleaned).not.toContain("alert(1)");
  });

  it.each([
    ["percent-encoded", "java%73cript%3Aalert(1)"],
    ["mixed-case", "JaVaScRiPt:alert(1)"],
    ["data:", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="],
    ["vbscript:", "vbscript:msgbox(1)"],
    ["protocol-relative external", "//evil.example/x.svg#frag"],
    ["absolute external", "https://evil.example/x.svg#frag"],
  ])("removes a %s href", (_label, href) => {
    const vector = `<svg xmlns="http://www.w3.org/2000/svg"><use href="${href}"/></svg>`;
    const cleaned = sanitizeSvg(vector);
    const parsed = parseSvg(cleaned);

    expect(parsed.querySelector("use")?.getAttribute("href")).toBeNull();
    expect(cleaned.toLowerCase()).not.toContain("evil.example");
    expect(cleaned.toLowerCase()).not.toContain("javascript");
    expect(cleaned.toLowerCase()).not.toContain("vbscript");
  });

  it.each(["onload", "onclick", "onmouseover", "onerror", "ONLOAD"])(
    "removes the %s event handler attribute",
    (attribute) => {
      const vector = `<svg xmlns="http://www.w3.org/2000/svg" ${attribute}="alert(1)"><rect width="1" height="1" ${attribute}="alert(2)"/></svg>`;
      const cleaned = sanitizeSvg(vector);

      expect(cleaned.toLowerCase()).not.toContain(attribute.toLowerCase());
      expect(cleaned).not.toContain("alert(");
      expect(cleaned).toContain("rect");
    },
  );

  it.each([
    ["script", '<script type="text/javascript">alert(1)</script>'],
    ["foreignObject", '<foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="alert(1)"/></body></foreignObject>'],
    ["style", "<style>*{background:url(javascript:alert(1))}</style>"],
    ["animate", '<animate attributeName="href" values="javascript:alert(1)"/>'],
    ["set", '<set attributeName="href" to="javascript:alert(1)"/>'],
  ])("removes a hostile <%s> element", (_label, hostile) => {
    const vector = `<svg xmlns="http://www.w3.org/2000/svg">${hostile}<rect width="1" height="1"/></svg>`;
    const cleaned = sanitizeSvg(vector);

    expect(cleaned).not.toContain("alert(");
    expect(cleaned.toLowerCase()).not.toContain("javascript");
    expect(cleaned).not.toMatch(/<\s*(script|foreignObject|style|animate|set)\b/i);
    // Benign siblings survive so the SVG still renders.
    expect(cleaned).toContain("rect");
  });

  it("keeps a benign defs/symbol/use fragment reference intact", () => {
    const benign =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><symbol id="x" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></symbol></defs><use href="#x"/><circle cx="12" cy="12" r="10"/></svg>';

    const cleaned = sanitizeSvg(benign);
    const parsed = parseSvg(cleaned);

    expect(parsed.localName.toLowerCase()).toBe("svg");
    expect(parsed.querySelector("defs")).not.toBeNull();
    expect(parsed.querySelector("symbol#x")).not.toBeNull();
    expect(parsed.querySelector("symbol path")?.getAttribute("d")).toBe("M0 0h24v24H0z");
    expect(parsed.querySelector("use")?.getAttribute("href")).toBe("#x");
    expect(parsed.querySelector("circle")).not.toBeNull();
  });

  it("fails closed for empty, malformed and non-SVG input", () => {
    expect(sanitizeSvg("")).toBe("");
    expect(sanitizeSvg("   ")).toBe("");
    expect(sanitizeSvg(42)).toBe("");
    expect(sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><text>&unknown;</text></svg>')).toBe("");
    expect(sanitizeSvg('<html><body><img src="x" onerror="alert(1)"/></body></html>')).toBe("");
  });
});

describe("safeHref", () => {
  it("accepts http(s), mailto and same-origin relative references", () => {
    expect(safeHref("https://example.com/a")).toBe("https://example.com/a");
    expect(safeHref("http://example.com/a")).toBe("http://example.com/a");
    expect(safeHref("mailto:someone@example.com")).toBe("mailto:someone@example.com");
    expect(safeHref("/relative/path")).toBe("/relative/path");
    expect(safeHref("  https://example.com/a  ")).toBe("https://example.com/a");
  });

  it.each([
    ["javascript", "javascript:alert(1)"],
    ["uppercase javascript", "JavaScript:alert(1)"],
    ["data", "data:text/html,<script>alert(1)</script>"],
    ["vbscript", "vbscript:msgbox(1)"],
    ["control characters", "java\nscript:alert(1)"],
  ])("rejects a %s URL", (_label, href) => {
    expect(safeHref(href)).toBeNull();
  });

  it("rejects non-string and blank values", () => {
    expect(safeHref(null)).toBeNull();
    expect(safeHref(undefined)).toBeNull();
    expect(safeHref(3)).toBeNull();
    expect(safeHref("")).toBeNull();
    expect(safeHref("   ")).toBeNull();
  });
});

describe("safeMediaSrc", () => {
  it("accepts http(s) and relative media sources", () => {
    expect(safeMediaSrc("https://cdn.example/x.png")).toBe("https://cdn.example/x.png");
    expect(safeMediaSrc("http://cdn.example/x.png")).toBe("http://cdn.example/x.png");
    expect(safeMediaSrc("/assets/x.png")).toBe("/assets/x.png");
  });

  it.each([
    ["javascript", "javascript:alert(1)"],
    ["data", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="],
    ["vbscript", "vbscript:msgbox(1)"],
    ["mailto", "mailto:someone@example.com"],
  ])("rejects a %s source", (_label, src) => {
    expect(safeMediaSrc(src)).toBeNull();
  });

  it("rejects non-string values", () => {
    expect(safeMediaSrc(null)).toBeNull();
    expect(safeMediaSrc({})).toBeNull();
  });
});

describe("sanitizeEChartOption", () => {
  it("drops handler/graphic/html/renderer keys at every depth", () => {
    const cleaned = sanitizeEChartOption({
      onclick: "alert(1)",
      graphic: { elements: [] },
      html: "<script>alert(1)</script>",
      renderer: "svg",
      series: [{ type: "bar", label: { formatter: "alert(1)" }, ONCLICK: "alert(2)" }],
    });

    expect(cleaned).not.toHaveProperty("onclick");
    expect(cleaned).not.toHaveProperty("graphic");
    expect(cleaned).not.toHaveProperty("html");
    expect(cleaned).not.toHaveProperty("renderer");
    const series = cleaned["series"] as Array<Record<string, unknown>>;
    expect(series[0]).not.toHaveProperty("ONCLICK");
    expect(series[0]?.["label"]).toEqual({ formatter: "alert(1)" });
  });

  it("strips url() and dangerous schemes from string values", () => {
    const cleaned = sanitizeEChartOption({
      title: "javascript:alert(1)",
      background: "url(https://evil.example/x.png)",
      note: "safe text",
    });

    expect(cleaned["title"]).not.toContain("javascript");
    expect(cleaned["background"]).not.toContain("url(");
    expect(cleaned["note"]).toBe("safe text");
  });

  it("forces the tooltip to richText rendering", () => {
    const cleaned = sanitizeEChartOption({ tooltip: { trigger: "item", renderMode: "html" } });
    expect(cleaned["tooltip"]).toEqual({ trigger: "item", renderMode: "richText" });
  });

  it("caps depth and array length", () => {
    let deep: Record<string, unknown> = { leaf: "ok" };
    for (let index = 0; index < 15; index += 1) deep = { nested: deep };

    const cleaned = sanitizeEChartOption(deep, 3, 4);
    let cursor: unknown = cleaned;
    let levels = 0;
    while (cursor !== null && typeof cursor === "object") {
      levels += 1;
      cursor = (cursor as Record<string, unknown>)["nested"] ?? null;
    }
    expect(levels).toBeLessThanOrEqual(4);

    const array = sanitizeEChartOption({ data: Array.from({ length: 10 }, (_, index) => index) }, 10, 4);
    expect((array["data"] as unknown[]).length).toBe(4);
  });

  it("returns an object for non-object input", () => {
    expect(sanitizeEChartOption(null)).toEqual({ tooltip: { renderMode: "richText" } });
    expect(sanitizeEChartOption("nope")).toEqual({ tooltip: { renderMode: "richText" } });
  });
});

describe("stripSecretFields", () => {
  it("removes top-level secret ids and recurses into nested fields", () => {
    const cleaned = stripSecretFields(
      {
        id: "form-1",
        password: "hunter2",
        fields: { password: "hunter2", email: "someone@example.com" },
      },
      new Set(["password"]),
    );

    expect(cleaned["password"]).toBeUndefined();
    expect(cleaned["fields"]).toEqual({ email: "someone@example.com" });
    expect(JSON.stringify(cleaned)).not.toContain("hunter2");
  });

  it("returns an equivalent object when nothing is secret", () => {
    expect(stripSecretFields({ a: 1 }, new Set())).toEqual({ a: 1 });
  });
});
