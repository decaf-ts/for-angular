import type { AtFileEntry } from "./types";
import {
  INDEX_TTL_MS,
  MAX_CANDIDATES,
  PASTED_MENTION_MARKER,
  activeAtQuery,
  basenameOf,
  candidateRows,
  dirnameOf,
  draftMentions,
  ignoreRuleKey,
  insertReference,
  isProtectedMentionToken,
  protectPastedMentions,
  rankEntries,
  scanMentions,
  stripPastedMentionMarkers,
  toIgnoreRule,
  withoutToken,
} from "./utils";

function entry(relative: string, kind: "file" | "dir" = "file"): AtFileEntry {
  return { path: `/workspace/${relative}`, relative, kind };
}

describe("at-file utils", () => {
  it("exposes the documented cache and candidate limits", () => {
    expect(INDEX_TTL_MS).toBe(30_000);
    expect(MAX_CANDIDATES).toBe(50);
    expect(PASTED_MENTION_MARKER).toBe("\u2060");
  });

  it("splits relative paths into basename and directory", () => {
    expect(basenameOf("src/index.ts")).toBe("index.ts");
    expect(basenameOf("index.ts")).toBe("index.ts");
    expect(dirnameOf("src/nested/index.ts")).toBe("src/nested");
    expect(dirnameOf("index.ts")).toBe("");
  });

  describe("activeAtQuery", () => {
    it("returns the active query at the caret", () => {
      expect(activeAtQuery("hello @src")).toEqual({
        query: "src",
        start: 6,
        end: 10,
      });
    });

    it("includes text after the caret up to the next whitespace", () => {
      expect(activeAtQuery("hello @src", 8)).toEqual({
        query: "src",
        start: 6,
        end: 10,
      });
      expect(activeAtQuery("hello @src tail", 10)).toEqual({
        query: "src",
        start: 6,
        end: 10,
      });
    });

    it("tracks an empty query right after the at sign", () => {
      expect(activeAtQuery("hello @", 7)).toEqual({
        query: "",
        start: 6,
        end: 7,
      });
    });

    it("returns null when no token is active", () => {
      expect(activeAtQuery("hello", 5)).toBeNull();
      expect(activeAtQuery("", 0)).toBeNull();
      expect(activeAtQuery("hello @src tail", 15)).toBeNull();
      expect(activeAtQuery("hello @src", 0)).toBeNull();
      expect(activeAtQuery("a@b@c", 5)).toEqual({
        query: "c",
        start: 3,
        end: 5,
      });
    });

    it("ignores pasted/protected tokens", () => {
      expect(activeAtQuery(`hello @${PASTED_MENTION_MARKER}src`)).toBeNull();
      expect(
        activeAtQuery(`hello @src${PASTED_MENTION_MARKER}tail`, 10)
      ).toBeNull();
    });
  });

  describe("draft mentions", () => {
    const indexed = new Set(["a.txt", "dir", "src/index.ts"]);

    it("reports indexed tokens with their removal ranges", () => {
      const mentions = draftMentions(
        "see @a.txt and @dir/ and @missing.txt and @src/index.ts",
        indexed
      );

      expect(mentions.map((mention) => mention.relative)).toEqual([
        "a.txt",
        "dir",
        "src/index.ts",
      ]);
      const draft = "see @a.txt and @dir/ and @missing.txt and @src/index.ts";
      expect(draft.slice(mentions[0].start, mentions[0].end)).toBe("@a.txt");
      expect(draft.slice(mentions[1].start, mentions[1].end)).toBe("@dir/");
      expect(draft.slice(mentions[2].start, mentions[2].end)).toBe(
        "@src/index.ts"
      );
    });

    it("deduplicates repeated indexed tokens", () => {
      expect(
        draftMentions("@a.txt and @a.txt", indexed).map(
          (mention) => mention.relative
        )
      ).toEqual(["a.txt"]);
    });

    it("skips pasted markers and unindexed paths", () => {
      expect(
        draftMentions(`@${PASTED_MENTION_MARKER}a.txt @other.txt`, indexed)
      ).toEqual([]);
    });

    it("removes a token by its reported range", () => {
      const draft = "see @a.txt and more";
      const [mention] = draftMentions(draft, indexed);

      expect(withoutToken(draft, mention.start, mention.end)).toBe(
        "see  and more"
      );
    });
  });

  it("scans plain mentions with deduplication and trailing-slash normalization", () => {
    expect(scanMentions("@a.txt @b/ @a.txt @ spaced")).toEqual([
      "a.txt",
      "b",
    ]);
  });

  it("protects and strips pasted mention markers", () => {
    const protectedText = protectPastedMentions("a@b c@d");
    expect(protectedText).toBe(
      `a@${PASTED_MENTION_MARKER}b c@${PASTED_MENTION_MARKER}d`
    );
    expect(isProtectedMentionToken(`${PASTED_MENTION_MARKER}b`)).toBe(true);
    expect(stripPastedMentionMarkers(protectedText)).toBe("a@b c@d");
    expect(scanMentions(protectedText)).toEqual([]);
  });

  it("inserts file and directory references at the query span", () => {
    const query = activeAtQuery("hi @sr")!;

    expect(insertReference("hi @sr", query, "src/a.ts", "file")).toEqual({
      text: "hi @src/a.ts ",
      caret: 13,
    });
    expect(insertReference("hi @sr", query, "src", "dir")).toEqual({
      text: "hi @src/ ",
      caret: 9,
    });
  });

  describe("ranking", () => {
    it("browses directories first at the shallowest depth", () => {
      const files = [
        entry("zeta.txt"),
        entry("src", "dir"),
        entry("alpha.txt"),
        entry("docs/nested/file.md"),
      ];

      expect(
        rankEntries(files, "", 10).map((file) => file.relative)
      ).toEqual(["src", "alpha.txt", "zeta.txt", "docs/nested/file.md"]);
    });

    it("ranks exact matches ahead of prefix, substring and subsequence matches", () => {
      const files = [
        entry("notes.md.bak"),
        entry("my-notes.md"),
        entry("notes.md"),
        entry("n-o-t-e-s.md"),
      ];

      expect(rankEntries(files, "notes.md", 10)[0].relative).toBe("notes.md");
    });

    it("ranks prefix matches by basename", () => {
      const files = [
        entry("src/index.ts"),
        entry("docs/index.md"),
        entry("other.ts"),
      ];

      const ranked = rankEntries(files, "index", 10).map(
        (file) => file.relative
      );
      expect(ranked).toEqual(["src/index.ts", "docs/index.md"]);
    });

    it("supports segment queries", () => {
      const files = [
        entry("src/index.ts"),
        entry("src/indigo.ts"),
        entry("docs/index.md"),
      ];

      expect(
        rankEntries(files, "src/ind", 10).map((file) => file.relative)
      ).toEqual(["src/index.ts", "src/indigo.ts"]);
    });

    it("orders descendants by depth for a trailing-slash query", () => {
      const files = [
        entry("src/nested/deep.ts"),
        entry("src/index.ts"),
        entry("other/index.ts"),
      ];

      expect(
        rankEntries(files, "src/", 10).map((file) => file.relative)
      ).toEqual(["src/index.ts", "src/nested/deep.ts"]);
    });

    it("filters out non-matching paths and respects the limit", () => {
      const files = [entry("a.txt"), entry("b.txt"), entry("c.txt")];

      expect(rankEntries(files, "zzz", 10)).toEqual([]);
      expect(rankEntries(files, "", 2)).toHaveLength(2);
      expect(rankEntries(files, "", 0)).toHaveLength(0);
    });
  });

  describe("candidate rows", () => {
    it("disambiguates duplicate basenames by directory", () => {
      const rows = candidateRows([
        entry("src/index.ts"),
        entry("docs/index.ts"),
        entry("README.md"),
        entry("assets", "dir"),
      ]);

      expect(rows[0]).toEqual({
        entry: entry("src/index.ts"),
        name: "index.ts - src",
        description: "src",
        kind: "file",
      });
      expect(rows[1]).toEqual({
        entry: entry("docs/index.ts"),
        name: "index.ts - docs",
        description: "docs",
        kind: "file",
      });
      expect(rows[2]).toEqual({
        entry: entry("README.md"),
        name: "README.md",
        kind: "file",
      });
      expect(rows[3]).toMatchObject({
        name: "assets",
        kind: "dir",
      });
      expect(rows[3].description).toBeUndefined();
    });

    it("keeps the basename when duplicates share the same basename but only one root entry", () => {
      const rows = candidateRows([entry("README.md"), entry("README.md.txt")]);
      expect(rows.map((row) => row.name)).toEqual(["README.md", "README.md.txt"]);
    });
  });

  it("normalizes ignore rules and keys them by kind, pattern and case", () => {
    expect(toIgnoreRule("A.txt")).toEqual({
      kind: "exact",
      pattern: "A.txt",
      caseSensitive: false,
    });
    const rule = {
      kind: "regex" as const,
      pattern: "A.txt",
      caseSensitive: true,
    };
    expect(toIgnoreRule(rule)).toBe(rule);
    expect(ignoreRuleKey("A.txt")).toBe(ignoreRuleKey("a.txt"));
    expect(ignoreRuleKey("A.txt")).not.toBe(
      ignoreRuleKey({ ...rule, kind: "exact" })
    );
  });
});
