import { safeMediaUrl } from "./agentMediaUrl";

describe("safeMediaUrl", () => {
  describe("allowed media sources", () => {
    it.each([
      ["https", "https://example.test/x.png"],
      ["http", "http://example.test/x.png"],
      ["uppercase https", "HTTPS://example.test/x.png"],
      ["blob", "blob:photo"],
      ["data:image/png", "data:image/png;base64,AAAA"],
      ["data:image/svg+xml", "data:image/svg+xml,%3Csvg%3E%3C/svg%3E"],
    ])("returns the %s URL unchanged", (_label, url) => {
      expect(safeMediaUrl(url)).toBe(url);
    });
  });

  describe("blocked media sources", () => {
    it.each([
      ["javascript", "javascript:alert(1)"],
      ["data:text/html", "data:text/html,<script>alert(1)</script>"],
      ["scheme-less text", "not-a-url"],
      ["tab-obfuscated scheme", "java\tscript:alert(1)"],
      ["newline-obfuscated scheme", "java\nscript:alert(1)"],
      ["whitespace only", "   "],
      ["empty", ""],
    ])("returns null for %s", (_label, url) => {
      expect(safeMediaUrl(url)).toBeNull();
    });

    it("returns null for null and undefined", () => {
      expect(safeMediaUrl(null)).toBeNull();
      expect(safeMediaUrl(undefined)).toBeNull();
    });
  });
});
