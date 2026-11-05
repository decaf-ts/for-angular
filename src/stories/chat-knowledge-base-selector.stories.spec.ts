import stories, {
  closed,
  documents,
  empty,
  loading,
  preselected,
  readOnly,
  sourcesCompatibility,
} from "./chat-knowledge-base-selector.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-knowledge-base-selector.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/KnowledgeBase meta and every story", () => {
    expect((stories as any).title).toBe("Agent/Chat/KnowledgeBase");
    expect((stories as any).component).toBeDefined();
    expect(typeof (stories as any).component).toBe("function");
    expect((stories as any).component.name).toBe(
      "ChatKnowledgeBaseSelectorComponent",
    );
    for (const story of [
      documents,
      preselected,
      loading,
      empty,
      sourcesCompatibility,
      readOnly,
      closed,
    ]) {
      expect(story).toBeDefined();
    }
  });

  it("wires the three-document default and inputs", () => {
    const meta = (stories as any).args ?? {};

    expect(meta.open).toBe(true);
    expect(meta.entries).toHaveLength(3);
    expect(meta.entries.map((entry: { id: string }) => entry.id)).toEqual([
      "kb-handbook",
      "kb-price-list",
      "kb-policies",
    ]);
    expect(meta.sources).toBeNull();
    expect(meta.selectedIds).toEqual([]);
    expect(meta.loading).toBe(false);
    expect(meta.uploadEnabled).toBe(true);
    expect(meta.deleteEnabled).toBe(true);
    expect(meta.skeletonRows).toBe(3);
    expect(meta.title).toBeNull();
  });

  it("wires the per-story args", () => {
    expect(argsOf(documents)).toEqual({});
    expect(argsOf(preselected).selectedIds).toEqual([
      "kb-handbook",
      "kb-policies",
    ]);
    expect(argsOf(loading).loading).toBe(true);
    expect(argsOf(loading).skeletonRows).toBe(3);
    expect(argsOf(empty).entries).toEqual([]);
    expect(argsOf(empty).selectedIds).toEqual([]);
    expect(argsOf(sourcesCompatibility).entries).toBeNull();
    expect(argsOf(sourcesCompatibility).sources).toHaveLength(2);
    expect(argsOf(sourcesCompatibility).sources[0].id).toBe("kb-handbook");
    expect(argsOf(readOnly).uploadEnabled).toBe(false);
    expect(argsOf(readOnly).deleteEnabled).toBe(false);
    expect(argsOf(closed).open).toBe(false);
  });
});
