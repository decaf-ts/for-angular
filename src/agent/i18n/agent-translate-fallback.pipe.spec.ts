import { Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { TranslateService } from "@ngx-translate/core";

import { GraphTranslateService } from "../../graph/i18n/graph-translate.service";
import { AgentTranslateFallbackPipe } from "./agent-translate-fallback.pipe";

@Component({
  standalone: true,
  imports: [AgentTranslateFallbackPipe],
  template: `{{ key() | translateFallback: "the fallback" }}`,
})
class TranslateFallbackHost {
  readonly key = signal<string | undefined>("agent.chat.title");
}

function mountHost(
  providers: unknown[] = [],
): ComponentFixture<TranslateFallbackHost> {
  TestBed.configureTestingModule({
    imports: [TranslateFallbackHost],
    providers,
  });
  return TestBed.createComponent(TranslateFallbackHost);
}

describe("AgentTranslateFallbackPipe", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("resolves the key through the translate service", () => {
    const keyFn = jest.fn().mockReturnValue("translated title");
    const fixture = mountHost([
      { provide: GraphTranslateService, useValue: { key: keyFn } },
    ]);
    fixture.detectChanges();

    expect(keyFn).toHaveBeenCalledWith("agent.chat.title", "the fallback");
    expect(fixture.nativeElement.textContent.trim()).toBe("translated title");
  });

  it("returns the fallback when the translate service falls back", () => {
    const keyFn = jest.fn().mockReturnValue("agent.chat.missing");
    const fixture = mountHost([
      { provide: GraphTranslateService, useValue: { key: keyFn } },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe("agent.chat.missing");
  });

  it("returns the fallback for an undefined key without consulting the service", () => {
    const keyFn = jest.fn();
    const fixture = mountHost([
      { provide: GraphTranslateService, useValue: { key: keyFn } },
    ]);
    fixture.componentInstance.key.set(undefined);
    fixture.detectChanges();

    expect(keyFn).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent.trim()).toBe("the fallback");
  });

  it("reacts to key changes (impure pipe)", () => {
    const keyFn = jest.fn().mockReturnValue("translated title");
    const fixture = mountHost([
      { provide: GraphTranslateService, useValue: { key: keyFn } },
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe("translated title");

    fixture.componentInstance.key.set("agent.chat.typing");
    fixture.detectChanges();

    expect(keyFn).toHaveBeenCalledWith("agent.chat.typing", "the fallback");
    expect(fixture.nativeElement.textContent.trim()).toBe("translated title");
  });

  it("falls back when the application provides no TranslateService", () => {
    const fixture = mountHost();
    fixture.detectChanges();

    expect(TestBed.inject(TranslateService, null)).toBeNull();
    expect(fixture.nativeElement.textContent.trim()).toBe("the fallback");
  });
});
